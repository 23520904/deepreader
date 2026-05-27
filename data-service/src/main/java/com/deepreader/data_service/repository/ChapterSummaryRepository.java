package com.deepreader.data_service.repository;

import com.deepreader.core.model.ChapterSummary;
import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface ChapterSummaryRepository extends ReactiveMongoRepository<ChapterSummary, String> {
	Flux<ChapterSummary> findByBookId(String bookId);
	Mono<Void> deleteByBookId(String bookId);
}
