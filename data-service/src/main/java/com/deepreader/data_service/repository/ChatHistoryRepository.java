package com.deepreader.data_service.repository;

import com.deepreader.core.model.ChatHistory;
import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import reactor.core.publisher.Flux;

public interface ChatHistoryRepository extends ReactiveMongoRepository<ChatHistory, String> {
	Flux<ChatHistory> findByBookIdOrderByTimestampAsc(String bookId);
}