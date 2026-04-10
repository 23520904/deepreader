package com.deepreader.core.model;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ChapterSummary {
    private String id;
    private String chapterId;
    private String bookId;
    private String content;
    private String model;
    private LocalDateTime createdAt;
}