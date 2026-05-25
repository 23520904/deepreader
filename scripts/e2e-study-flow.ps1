param(
	[string]$BaseUrl = "http://localhost:8083",
	[string]$PdfPath = "",
	[string]$BookId = "",
	[switch]$SkipAi
)

$ErrorActionPreference = "Stop"

function Invoke-JsonApi {
	param(
		[string]$Method,
		[string]$Path,
		[object]$Body = $null,
		[string]$Token = ""
	)

	$headers = @{}
	if ($Token) {
		$headers["Authorization"] = "Bearer $Token"
	}

	$params = @{
		Method = $Method
		Uri = "$BaseUrl$Path"
		Headers = $headers
	}

	if ($null -ne $Body) {
		$params["ContentType"] = "application/json"
		$params["Body"] = ($Body | ConvertTo-Json -Depth 8)
	}

	Invoke-RestMethod @params
}

function Invoke-ExpectedStatus {
	param(
		[string]$Method,
		[string]$Path,
		[string]$Token,
		[int]$ExpectedStatus
	)

	try {
		$response = Invoke-WebRequest -Method $Method -Uri "$BaseUrl$Path" -Headers @{ Authorization = "Bearer $Token" }
		if ($response.StatusCode -ne $ExpectedStatus) {
			throw "Expected HTTP $ExpectedStatus but got HTTP $($response.StatusCode)"
		}
	} catch {
		$statusCode = $_.Exception.Response.StatusCode.value__
		if ($statusCode -ne $ExpectedStatus) {
			throw
		}
	}
}

function Upload-Document {
	param(
		[string]$Token,
		[string]$Path
	)

	Add-Type -AssemblyName System.Net.Http
	$client = [System.Net.Http.HttpClient]::new()
	$client.DefaultRequestHeaders.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new("Bearer", $Token)
	$form = [System.Net.Http.MultipartFormDataContent]::new()
	$fileBytes = [System.IO.File]::ReadAllBytes((Resolve-Path $Path))
	$filePart = [System.Net.Http.ByteArrayContent]::new($fileBytes)
	$filePart.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("application/pdf")
	$form.Add($filePart, "file", [System.IO.Path]::GetFileName($Path))

	$response = $client.PostAsync("$BaseUrl/api/v1/books/upload", $form).Result
	$content = $response.Content.ReadAsStringAsync().Result
	if (-not $response.IsSuccessStatusCode) {
		throw "Upload failed with HTTP $([int]$response.StatusCode): $content"
	}

	$content | ConvertFrom-Json
}

$suffix = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$password = "Password123!"

$owner = Invoke-JsonApi -Method "POST" -Path "/api/v1/auth/register" -Body @{
	username = "E2E Owner"
	email = "e2e_owner_$suffix@example.com"
	password = $password
}

if ($PdfPath) {
	$upload = Upload-Document -Token $owner.token -Path $PdfPath
	$BookId = $upload.book.id
}

if (-not $BookId) {
	$books = Invoke-JsonApi -Method "GET" -Path "/api/v1/books" -Token $owner.token
	if ($books.Count -gt 0) {
		$BookId = $books[0].id
	}
}

if (-not $BookId) {
	throw "No BookId available. Pass -BookId or -PdfPath."
}

Invoke-JsonApi -Method "GET" -Path "/api/v1/books/$BookId/content" -Token $owner.token | Out-Null

if (-not $SkipAi) {
	Invoke-JsonApi -Method "POST" -Path "/api/v1/books/$BookId/search" -Token $owner.token -Body @{
		query = "What is the main idea?"
		limit = 5
	} | Out-Null
	Invoke-JsonApi -Method "POST" -Path "/api/v1/books/$BookId/chat" -Token $owner.token -Body @{
		query = "Summarize the key points briefly."
		limit = 5
		threadId = "e2e-$suffix"
	} | Out-Null
	Invoke-JsonApi -Method "POST" -Path "/api/v1/books/$BookId/summary" -Token $owner.token -Body @{} | Out-Null
	Invoke-JsonApi -Method "POST" -Path "/api/v1/books/$BookId/flashcards" -Token $owner.token -Body @{ count = 3 } | Out-Null
}

$intruder = Invoke-JsonApi -Method "POST" -Path "/api/v1/auth/register" -Body @{
	username = "E2E Intruder"
	email = "e2e_intruder_$suffix@example.com"
	password = $password
}

Invoke-ExpectedStatus -Method "GET" -Path "/api/v1/books/$BookId/summaries" -Token $intruder.token -ExpectedStatus 403

Write-Host "E2E study flow passed for book $BookId"
