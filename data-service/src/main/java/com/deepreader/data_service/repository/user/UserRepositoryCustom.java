package com.deepreader.data_service.repository.user; // Viết thường hết

import com.deepreader.core.model.User;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface UserRepositoryCustom {
    Flux<User> searchUsers(String keyword);
    Mono<Long> countUsersCreatedInRange(String startDate, String endDate);
}