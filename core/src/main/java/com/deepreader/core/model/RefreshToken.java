package com.deepreader.core.model;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class RefreshToken {
    private String id;
    private String userId;
    private String tokenHash;
    private LocalDateTime expiresAt;
}