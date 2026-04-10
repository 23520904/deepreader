package com.deepreader.ai_service;

import com.deepreader.ai_service.model.AuthResponse;
import com.deepreader.ai_service.model.ChatAskResponse;
import com.deepreader.ai_service.model.Flashcard;
import com.deepreader.ai_service.model.FlashcardResponse;
import com.deepreader.ai_service.model.IngestionJobResponse;
import com.deepreader.ai_service.model.IngestionResult;
import com.deepreader.ai_service.model.SearchResponse;
import com.deepreader.ai_service.model.SourceReference;
import com.deepreader.ai_service.model.SummaryResponse;
import com.deepreader.ai_service.model.UserRole;
import com.deepreader.ai_service.service.ChatService;
import com.deepreader.ai_service.service.DocumentIngestionService;
import com.deepreader.ai_service.service.IngestionJobService;
import com.deepreader.ai_service.service.JwtService;
import com.deepreader.ai_service.service.ObjectStorageService;
import com.deepreader.ai_service.service.UserAccountService;
import com.deepreader.ai_service.service.GenerationService;
import com.deepreader.ai_service.service.RetrievalService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;

@SpringBootTest(
		webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
		properties = {
				"spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration",
				"deepreader.auth.jwt.secret=test-secret-test-secret-test-secret-1234"
		}
)
@AutoConfigureWebTestClient
class AiServiceApplicationTests {

	@Autowired
	private WebTestClient webTestClient;

	@Autowired
	private JwtService jwtService;

	@MockBean
	private UserAccountService userAccountService;
	@MockBean
	private JdbcTemplate jdbcTemplate;
	@MockBean
	private DocumentIngestionService documentIngestionService;
	@MockBean
	private IngestionJobService ingestionJobService;
	@MockBean
	private ObjectStorageService objectStorageService;
	@MockBean
	private RetrievalService retrievalService;
	@MockBean
	private ChatService chatService;
	@MockBean
	private GenerationService generationService;

	@Test
	void registerReturnsToken() {
		Mockito.when(userAccountService.register(anyString(), anyString()))
				.thenReturn(new UserAccountService.UserRecord("user-1", "test@example.com", UserRole.USER));
		webTestClient.post()
				.uri("/api/auth/register")
				.contentType(MediaType.APPLICATION_JSON)
				.bodyValue("{\"email\":\"test@example.com\",\"password\":\"password123\"}")
				.exchange()
				.expectStatus().isOk()
				.expectBody(AuthResponse.class)
				.value(response -> {
					assert response != null;
					assert response.token() != null && !response.token().isBlank();
				});
	}

	@Test
	void uploadEndpointWorksWithBearerToken() {
		Mockito.when(documentIngestionService.ingestDocument(anyString(), any()))
				.thenReturn(Mono.just(new IngestionResult("doc-1", "book.pdf", 1, List.of("c1"), List.of("openai", "gemini"))));
		LinkedMultiValueMap<String, Object> multipartData = new LinkedMultiValueMap<>();
		multipartData.add("file", namedResource("book.pdf", "test-content"));
		webTestClient.post()
				.uri("/api/documents/upload")
				.header(HttpHeaders.AUTHORIZATION, bearer("user-1"))
				.contentType(MediaType.MULTIPART_FORM_DATA)
				.bodyValue(multipartData)
				.exchange()
				.expectStatus().isOk()
				.expectBody()
				.jsonPath("$.documentId").isEqualTo("doc-1");
	}

	@Test
	void searchEndpointReturnsMatches() {
		Mockito.when(retrievalService.search(anyString(), anyString(), anyInt(), anyString()))
				.thenReturn(Mono.just(new SearchResponse("q", 5, "gemini", List.of())));
		webTestClient.post()
				.uri("/api/documents/search")
				.header(HttpHeaders.AUTHORIZATION, bearer("user-1"))
				.contentType(MediaType.APPLICATION_JSON)
				.bodyValue("{\"query\":\"q\",\"limit\":5,\"provider\":\"gemini\"}")
				.exchange()
				.expectStatus().isOk()
				.expectBody()
				.jsonPath("$.provider").isEqualTo("gemini");
	}

	@Test
	void documentsEndpointRejectsMissingBearerToken() {
		webTestClient.post()
				.uri("/api/documents/search")
				.contentType(MediaType.APPLICATION_JSON)
				.bodyValue("{\"query\":\"q\",\"limit\":5,\"provider\":\"gemini\"}")
				.exchange()
				.expectStatus().isUnauthorized();
	}

	@Test
	void documentsEndpointRejectsInvalidBearerToken() {
		webTestClient.post()
				.uri("/api/documents/search")
				.header(HttpHeaders.AUTHORIZATION, "Bearer not-a-valid-token")
				.contentType(MediaType.APPLICATION_JSON)
				.bodyValue("{\"query\":\"q\",\"limit\":5,\"provider\":\"gemini\"}")
				.exchange()
				.expectStatus().isUnauthorized();
	}

	@Test
	void chatEndpointReturnsAnswer() {
		Mockito.when(chatService.ask(anyString(), anyString(), anyInt(), anyString()))
				.thenReturn(Mono.just(new ChatAskResponse("q", "a", List.of(new SourceReference("d", "c", "f", "s", "t", 1, "content", 0.9f)))));
		webTestClient.post()
				.uri("/api/documents/chat/ask")
				.header(HttpHeaders.AUTHORIZATION, bearer("user-1"))
				.contentType(MediaType.APPLICATION_JSON)
				.bodyValue("{\"query\":\"q\",\"limit\":5,\"provider\":\"gemini\"}")
				.exchange()
				.expectStatus().isOk()
				.expectBody()
				.jsonPath("$.answer").isEqualTo("a");
	}

	@Test
	void summaryEndpointReturnsSummary() {
		Mockito.when(generationService.summarize(anyString(), anyString(), anyString()))
				.thenReturn(Mono.just(new SummaryResponse("doc-1", "openai", "summary text")));
		webTestClient.post()
				.uri("/api/documents/summary")
				.header(HttpHeaders.AUTHORIZATION, bearer("user-1"))
				.contentType(MediaType.APPLICATION_JSON)
				.bodyValue("{\"documentId\":\"doc-1\",\"provider\":\"openai\"}")
				.exchange()
				.expectStatus().isOk()
				.expectBody()
				.jsonPath("$.summary").isEqualTo("summary text");
	}

	@Test
	void flashcardsEndpointReturnsCards() {
		Mockito.when(generationService.createFlashcards(anyString(), anyString(), anyString(), anyInt()))
				.thenReturn(Mono.just(new FlashcardResponse("doc-1", "openai", List.of(new Flashcard("q", "a")))));
		webTestClient.post()
				.uri("/api/documents/flashcards")
				.header(HttpHeaders.AUTHORIZATION, bearer("user-1"))
				.contentType(MediaType.APPLICATION_JSON)
				.bodyValue("{\"documentId\":\"doc-1\",\"provider\":\"openai\",\"count\":10}")
				.exchange()
				.expectStatus().isOk()
				.expectBody()
				.jsonPath("$.flashcards[0].question").isEqualTo("q");
	}

	@Test
	void asyncIngestionJobEndpointsWork() {
		Mockito.when(ingestionJobService.createPendingJob(anyString(), anyString(), any(), any()))
				.thenReturn(new IngestionJobResponse("job-1", "book.pdf", "PENDING", null, null));
		Mockito.when(objectStorageService.storeDocument(anyString(), anyString(), any(byte[].class)))
				.thenReturn("user-1/source/book.pdf");
		Mockito.when(ingestionJobService.getJob(anyString(), anyString()))
				.thenReturn(new IngestionJobResponse("job-1", "book.pdf", "SUCCEEDED", "doc-1", null));
		LinkedMultiValueMap<String, Object> multipartData = new LinkedMultiValueMap<>();
		multipartData.add("file", namedResource("book.pdf", "test-content"));
		webTestClient.post()
				.uri("/api/documents/upload/async")
				.header(HttpHeaders.AUTHORIZATION, bearer("user-1"))
				.contentType(MediaType.MULTIPART_FORM_DATA)
				.bodyValue(multipartData)
				.exchange()
				.expectStatus().isOk()
				.expectBody()
				.jsonPath("$.jobId").isEqualTo("job-1");

		webTestClient.get()
				.uri("/api/documents/jobs/job-1")
				.header(HttpHeaders.AUTHORIZATION, bearer("user-1"))
				.exchange()
				.expectStatus().isOk()
				.expectBody()
				.jsonPath("$.status").isEqualTo("SUCCEEDED");
	}

	private String bearer(String userId) {
		return "Bearer " + jwtService.generateAccessToken(userId, UserRole.USER);
	}

	private ByteArrayResource namedResource(String filename, String content) {
		return new ByteArrayResource(content.getBytes(StandardCharsets.UTF_8)) {
			@Override
			public String getFilename() {
				return filename;
			}
		};
	}
}
