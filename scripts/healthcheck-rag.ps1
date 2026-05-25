param(
    [string]$HaystackBaseUrl = "http://localhost:8000",
    [string]$AiServiceBaseUrl = "http://localhost:8080",
    [string]$Provider = "groq"
)

$ErrorActionPreference = "Stop"

function Invoke-JsonPost {
    param(
        [string]$Url,
        [object]$Body,
        [hashtable]$Headers = @{}
    )
    $json = $Body | ConvertTo-Json -Depth 10
    return Invoke-RestMethod -Method Post -Uri $Url -Headers $Headers -ContentType "application/json" -Body $json
}

Write-Host "Checking Haystack service health..."
$haystackHealth = Invoke-RestMethod -Method Get -Uri "$HaystackBaseUrl/health"
if ($haystackHealth.status -ne "ok") {
    throw "Haystack healthcheck failed."
}
Write-Host "Haystack service is healthy."

$embedding = @(for ($i = 0; $i -lt 768; $i++) { 0.001 })
$embeddings = @()
$embeddings += ,$embedding
$runId = [guid]::NewGuid().ToString("N")
$chunkId = "healthcheck-chunk-$runId"
$documentId = "healthcheck-document-$runId"

Write-Host "Running Haystack ingest smoke test..."
[void](Invoke-JsonPost -Url "$HaystackBaseUrl/ingest" -Body @{
    provider = $Provider
    chunks = @(
        @{
            chunk_id = $chunkId
            document_id = $documentId
            file_name = "healthcheck.txt"
            section_id = "section-1"
            title = "Healthcheck"
            chunk_index = 0
            content = "DeepReader healthcheck content for RAG roundtrip."
        }
    )
    embeddings = $embeddings
})
Write-Host "Haystack ingest passed."

Write-Host "Running Haystack search smoke test..."
$searchResult = Invoke-JsonPost -Url "$HaystackBaseUrl/search" -Body @{
    provider = $Provider
    query_embedding = $embedding
    limit = 1
}
if (-not $searchResult.matches -or $searchResult.matches.Count -lt 1) {
    throw "Haystack search returned no matches."
}
Write-Host "Haystack search passed. Top chunk: $($searchResult.matches[0].chunk_id)"

Write-Host "Checking AI service actuator health..."
$aiHealth = Invoke-RestMethod -Method Get -Uri "$AiServiceBaseUrl/actuator/health"
if ($aiHealth.status -ne "UP") {
    throw "AI service health is not UP."
}
Write-Host "AI service is healthy."

Write-Host "RAG healthcheck completed successfully."
