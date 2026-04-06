package com.deepreader.core.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "books")
@Data
public class Book {
    @Id
    private String id;
    @Indexed
    private String userId;
    private String title;
    private String status; // PROCESSING, READY
    private Integer totalChapters;
    private String format; // PDF, EPUB
    @Indexed
    private LocalDateTime createdAt;
}