package com.deepreader.core.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "flashcards")
@Data
public class Flashcard {
    @Id
    private String id;
    private String chapterId;
    @Indexed
    private String bookId;
    @Indexed
    private String userId;
    private String question;
    private String answer;
    private LocalDateTime createdAt;
}