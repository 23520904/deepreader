package com.deepreader.core.model;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class Flashcard {
    private String id;
    private String chapterId;
    private String bookId;
    private String userId;
    private String question;
    private String answer;
    private LocalDateTime createdAt;
}