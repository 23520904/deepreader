package com.deepreader.data_service.repository;

import com.deepreader.core.model.ReadingSession;
import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface ReadingSessionRepository extends ReactiveMongoRepository<ReadingSession, String> {
	Flux<ReadingSession> findByUserId(String userId);
	Flux<ReadingSession> findByBookId(String bookId);
	Mono<Void> deleteByBookId(String bookId);
}
