package com.deepreader.data_service.service.refreshtoken;

import com.deepreader.core.model.RefreshToken;
import com.deepreader.data_service.repository.refreshtoken.RefreshtokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefreshtokenServiceImpl implements RefreshtokenService {

    private final RefreshtokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public Mono<String> generateRefreshToken(String userId) {
        if (userId == null)
            return Mono.error(new IllegalArgumentException("User ID không được null"));

        String rawToken = UUID.randomUUID().toString();

        return refreshTokenRepository.deleteByUserId(userId)  // XÓA REFRESH TOKEN CŨ
                .then(
                        Mono.fromCallable(() -> passwordEncoder.encode(rawToken))
                                .subscribeOn(Schedulers.boundedElastic())
                )
                .flatMap(hashed -> {
                    RefreshToken token = new RefreshToken();
                    token.setUserId(userId);
                    token.setTokenHash(hashed);
                    token.setExpiresAt(Instant.now().plus(Duration.ofDays(7))); // TTL chuẩn
                    return refreshTokenRepository.save(token);
                })
                .thenReturn(rawToken);
    }

    @Override
    public Mono<String> resetRefreshToken(String userId) {
        return generateRefreshToken(userId); // đã xoá trước trong generate
    }

    @Override
    public Mono<Boolean> validateRefreshToken(String userId, String rawToken) {
        if (userId == null || rawToken == null) return Mono.just(false);

        return refreshTokenRepository.findByUserId(userId)
                .flatMap(token -> {
                    if (token.getExpiresAt().isBefore(Instant.now())) {
                        return Mono.just(false);
                    }

                    return Mono.fromCallable(() ->
                                    passwordEncoder.matches(rawToken, token.getTokenHash()))
                            .subscribeOn(Schedulers.boundedElastic());
                })
                .defaultIfEmpty(false);
    }

    @Override
    public Mono<Void> deleteRefreshtokenByUserId(String userId) {
        if (userId == null) return Mono.error(new IllegalArgumentException("User ID không được null"));
        return refreshTokenRepository.deleteByUserId(userId);
    }
}