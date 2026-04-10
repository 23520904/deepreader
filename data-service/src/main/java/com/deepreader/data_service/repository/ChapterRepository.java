package com.deepreader.data_service.repository;

import com.deepreader.core.model.Chapter;
import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import reactor.core.publisher.Flux;

public interface ChapterRepository extends ReactiveMongoRepository<Chapter, String> {
	Flux<Chapter> findByBookIdOrderByChapterNumberAsc(String bookId);
}