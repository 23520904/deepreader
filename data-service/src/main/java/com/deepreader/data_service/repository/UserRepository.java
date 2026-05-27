package com.deepreader.data_service.repository;

import com.deepreader.core.model.User;
import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import reactor.core.publisher.Mono;

public interface UserRepository extends ReactiveMongoRepository<User, String> {
	Mono<User> findByEmail(String email);
}