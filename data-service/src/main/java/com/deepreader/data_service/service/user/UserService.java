package com.deepreader.data_service.service.user;

import com.deepreader.core.model.User;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface UserService {
    // --- CREATE ---
    Mono<User> createUser(User user);

    // --- READ ---
    Mono<User> findById(String id);
    Mono<User> findByEmail(String email);
    Flux<User> findAllUsers(); // Lấy hết danh sách

    // --- UPDATE ---
    Mono<User> updateUser(String id, User user);

    // --- DELETE ---
    Mono<Void> deleteUser(String id);

    Mono<Boolean> existsByEmail(String email);
    Flux<User> searchUsers(String keyword);
    Mono<Long> countUsersCreatedInRange(String startDate, String endDate);
}