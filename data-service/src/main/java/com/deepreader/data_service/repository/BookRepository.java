package com.deepreader.data_service.repository;

import com.deepreader.core.model.Book;
import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import reactor.core.publisher.Flux;

public interface BookRepository extends ReactiveMongoRepository<Book, String> {
	Flux<Book> findByUserId(String userId);
}