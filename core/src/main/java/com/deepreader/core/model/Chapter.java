package com.deepreader.core.model;

import lombok.Data;

@Data
public class Chapter {
    private String id;
    private String bookId;
    private Integer chapterNumber;
    private String title;
    private String content;
    private Long wordCount;
}