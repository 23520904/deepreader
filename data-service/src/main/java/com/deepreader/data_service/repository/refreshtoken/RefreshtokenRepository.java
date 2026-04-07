package com.deepreader.data_service.repository.refreshtoken;

import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import com.deepreader.core.model.RefreshToken;
import reactor.core.publisher.Mono;

public interface RefreshtokenRepository extends ReactiveMongoRepository<RefreshToken, String> {

    Mono<Void> deleteByUserId(String userId);

    Mono<RefreshToken> findByUserId(String userId);
}