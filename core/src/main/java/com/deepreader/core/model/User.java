package com.deepreader.core.model;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class User {
    private String id;

    private String email;

    private String passwordHash;
    private String fullName;
    private String role;
    private String llmApiToken;
    private LocalDateTime createdAt;
}