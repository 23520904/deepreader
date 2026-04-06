package com.deepreader.core.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "refresh_tokens")
@Data
public class RefreshToken {
    @Id
    private String id;
    @Indexed
    private String userId;
    private String tokenHash;
    @Indexed(expireAfterSeconds = 0) // Tự xóa khi đến thời điểm expiresAt
    private LocalDateTime expiresAt;
}