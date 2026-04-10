package com.deepreader.core.model;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class Book {
    private String id;
    private String userId;
    private String aiDocumentId;
    private String title;
    private String status; // PROCESSING, READY
    private Integer totalChapters;
    private String format; // PDF, EPUB
    private LocalDateTime createdAt;
}