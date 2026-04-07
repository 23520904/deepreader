package com.deepreader.data_service.repository.user;

import com.deepreader.core.model.User;
import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import reactor.core.publisher.Mono;

public interface UserRepository extends ReactiveMongoRepository<User, String>, UserRepositoryCustom {
    // Kiểm tra xem email đã tồn tại hay chưa
    Mono<Boolean> existsByEmail(String email);

    Mono<User> findByEmail(String email);
}
