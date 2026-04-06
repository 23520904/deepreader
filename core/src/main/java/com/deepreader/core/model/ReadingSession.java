package com.deepreader.core.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "reading_sessions")
@Data
public class ReadingSession {
    @Id
    private String id;
    @Indexed
    private String userId;
    @Indexed
    private String bookId;
    private String chapterId;
    @Indexed
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Long wordsRead;
    private Double wpm;
}