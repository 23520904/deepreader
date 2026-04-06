package com.deepreader.core.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "summaries")
@Data
public class ChapterSummary {
    @Id
    private String id;
    @Indexed(unique = true)
    private String chapterId;
    private String bookId;
    private String content;
    private String model;
    private LocalDateTime createdAt;
}