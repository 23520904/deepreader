package com.deepreader.data_service.controller;

import com.deepreader.data_service.service.refreshtoken.RefreshtokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/refresh-token")
@RequiredArgsConstructor
public class RefreshtokenController {

    private final RefreshtokenService refreshTokenService;

    // ============================
    // 1. Generate Refresh Token
    // ============================
    @PostMapping("/generate/{userId}")
    public Mono<ResponseEntity<Map<String, Object>>> generate(@PathVariable String userId) {
        return refreshTokenService.generateRefreshToken(userId)
                .map(token -> ResponseEntity.ok(
                        Map.of(
                                "userId", userId,
                                "refreshToken", token,
                                "message", "Tạo refresh token thành công"
                        )
                ));
    }

    // ============================
    // 2. Reset Refresh Token
    // ============================
    @PostMapping("/reset/{userId}")
    public Mono<ResponseEntity<Map<String, Object>>> reset(@PathVariable String userId) {
        return refreshTokenService.resetRefreshToken(userId)
                .map(token -> ResponseEntity.ok(
                        Map.of(
                                "userId", userId,
                                "refreshToken", token,
                                "message", "Reset refresh token thành công"
                        )
                ));
    }

    // ============================
    // 3. Validate Refresh Token
    // ============================
    @PostMapping("/validate")
    public Mono<ResponseEntity<Map<String, Object>>> validate(
            @RequestParam String userId,
            @RequestParam String refreshToken
    ) {
        return refreshTokenService.validateRefreshToken(userId, refreshToken)
                .map(valid -> ResponseEntity.ok(
                        Map.of(
                                "userId", userId,
                                "valid", valid,
                                "message", valid ? "Refresh token hợp lệ" : "Refresh token không hợp lệ"
                        )
                ));
    }

    @DeleteMapping("/delete/{userId}")
    public Mono<ResponseEntity<Map<String, Object>>> delete(@PathVariable String userId) {
        return refreshTokenService.deleteRefreshtokenByUserId(userId)
                .thenReturn(ResponseEntity.ok(
                        Map.of(
                                "userId", userId,
                                "message", "Đã xóa refresh token của user"
                        )
                ));
    }
}