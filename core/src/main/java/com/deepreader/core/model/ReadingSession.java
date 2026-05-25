package com.deepreader.core.model;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ReadingSession {
    private String id;
    private String userId;
    private String bookId;
    private String chapterId;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Long wordsRead;
    private Double wpm;
}