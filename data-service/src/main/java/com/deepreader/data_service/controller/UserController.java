package com.deepreader.data_service.controller;

import com.deepreader.core.model.User;
import com.deepreader.data_service.service.user.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED) // Trả về 201 thay vì 200
    public Mono<User> create(@Valid @RequestBody User user) {
        return userService.createUser(user);
    }

    @GetMapping("/{id}")
    public Mono<ResponseEntity<User>> getById(@PathVariable String id) {
        return userService.findById(id)
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build()); // Trả về 404 nếu không thấy ID
    }

    @GetMapping
    public Flux<User> getAll() {
        return userService.findAllUsers();
    }

    @PutMapping("/{id}")
    public Mono<ResponseEntity<User>> update(@PathVariable String id, @Valid @RequestBody User user) {
        return userService.updateUser(id, user)
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT) // Trả về 204 sau khi xóa thành công
    public Mono<Void> delete(@PathVariable String id) {
        return userService.deleteUser(id);
    }

    @GetMapping("/search")
    public Flux<User> search(@RequestParam String keyword) {
        return userService.searchUsers(keyword);
    }

    @GetMapping("/count")
    public Mono<Long> count(@RequestParam String start, @RequestParam String end) {
        // Lưu ý: Start/End nên được parse sang LocalDateTime trong Service
        return userService.countUsersCreatedInRange(start, end);
    }
}