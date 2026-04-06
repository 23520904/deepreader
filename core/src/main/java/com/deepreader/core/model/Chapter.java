package com.deepreader.core.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "chapters")
@Data
public class Chapter {
    @Id
    private String id;
    @Indexed
    private String bookId;
    @Indexed
    private Integer chapterNumber;
    private String title;
    private String content;
    private Long wordCount;
}