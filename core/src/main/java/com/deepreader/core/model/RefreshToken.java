package com.deepreader.core.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "refresh_tokens")
@Data
public class RefreshToken {

    @Id
    private String id;

    @NotBlank(message = "Cần userId để tạo refresh token")
    @Indexed
    private String userId;

    @JsonIgnore
    private String tokenHash;

    @Indexed(expireAfterSeconds = 0)   // MongoDB TTL tự xóa khi đến expiresAt
    private Instant expiresAt;
}