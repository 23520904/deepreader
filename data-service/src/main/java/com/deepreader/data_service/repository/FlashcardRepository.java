package com.deepreader.data_service.repository;

import com.deepreader.core.model.Flashcard;
import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface FlashcardRepository extends ReactiveMongoRepository<Flashcard, String> {
	Flux<Flashcard> findByBookId(String bookId);
	Flux<Flashcard> findByUserId(String userId);
	Mono<Void> deleteByBookId(String bookId);
}
