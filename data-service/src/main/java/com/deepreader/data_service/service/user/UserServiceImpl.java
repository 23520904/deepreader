package com.deepreader.data_service.service.user;

import com.deepreader.core.model.User;
import com.deepreader.data_service.repository.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;

    // ============================
    // 1. CRUD chuẩn hóa exception
    // ============================

    @Override
    public Mono<User> createUser(User user) {
        log.info("Đang tạo mới user với email: {}", user.getEmail());

        return userRepository.existsByEmail(user.getEmail())
                .flatMap(exists -> {
                    if (exists) {
                        String msg = "Email đã tồn tại: " + user.getEmail();
                        log.error(msg);
                        return Mono.error(new RuntimeException(msg));
                    }
                    return userRepository.save(user);
                });
    }

    @Override
    public Mono<User> findById(String id) {
        return userRepository.findById(id)
                .switchIfEmpty(Mono.error(
                        new RuntimeException("Không tìm thấy User với ID: " + id)
                ));
    }

    @Override
    public Mono<User> findByEmail(String email) {
        return userRepository.findByEmail(email)
                .switchIfEmpty(Mono.error(
                        new RuntimeException("Không tìm thấy User với email: " + email)
                ));
    }

    @Override
    public Flux<User> findAllUsers() {
        return userRepository.findAll();
    }

    @Override
    public Mono<User> updateUser(String id, User user) {
        return userRepository.findById(id)
                .flatMap(existingUser -> {

                    // Update basic fields
                    if (user.getRole() != null) existingUser.setRole(user.getRole());
                    if (user.getFullName() != null) existingUser.setFullName(user.getFullName());

                    // Check email change
                    if (user.getEmail() != null && !user.getEmail().equals(existingUser.getEmail())) {
                        return userRepository.existsByEmail(user.getEmail())
                                .flatMap(isExisted -> {
                                    if (isExisted) {
                                        return Mono.error(new RuntimeException("Email mới đã tồn tại!"));
                                    }
                                    existingUser.setEmail(user.getEmail());
                                    return Mono.just(existingUser);
                                });
                    }

                    return Mono.just(existingUser);
                })
                .flatMap(userToSave -> {
                    log.info("Đang thực hiện lưu cập nhật User ID: {}", id);
                    return userRepository.save(userToSave);
                })
                .switchIfEmpty(Mono.error(
                        new RuntimeException("Không thể cập nhật vì ID không tồn tại")
                ));
    }

    @Override
    public Mono<Void> deleteUser(String id) {
        return userRepository.existsById(id)
                .flatMap(exists -> {
                    if (!exists) {
                        return Mono.error(new RuntimeException("Người dùng không tồn tại"));
                    }
                    return userRepository.deleteById(id);
                });
    }

    // ============================
    // 2. Business methods cũ
    // ============================

    @Override
    public Mono<Boolean> existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    @Override
    public Flux<User> searchUsers(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return Flux.empty();
        }
        return userRepository.searchUsers(keyword);
    }

    @Override
    public Mono<Long> countUsersCreatedInRange(String startDate, String endDate) {
        return userRepository.countUsersCreatedInRange(startDate, endDate);
    }
}