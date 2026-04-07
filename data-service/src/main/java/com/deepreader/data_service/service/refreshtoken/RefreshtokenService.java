package com.deepreader.data_service.service.refreshtoken;

import reactor.core.publisher.Mono;

public interface RefreshtokenService {

    Mono<String> generateRefreshToken(String userId);

    Mono<String> resetRefreshToken(String userId);

    Mono<Boolean> validateRefreshToken(String userId, String rawToken);

    Mono<Void> deleteRefreshtokenByUserId(String userId);
}