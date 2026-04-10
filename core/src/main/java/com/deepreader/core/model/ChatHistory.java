package com.deepreader.core.model;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ChatHistory {
    private String id;
    private String userId;
    private String bookId;
    private String role; // user, assistant
    private String content;
    private LocalDateTime timestamp;
}