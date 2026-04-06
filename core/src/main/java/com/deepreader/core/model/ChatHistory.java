package com.deepreader.core.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "chat_history")
@Data
public class ChatHistory {
    @Id
    private String id;
    @Indexed
    private String userId;
    @Indexed
    private String bookId;
    private String role; // user, assistant
    private String content;
    @Indexed(expireAfterSeconds = 2592000) // TTL 30 ngày
    private LocalDateTime timestamp;
}