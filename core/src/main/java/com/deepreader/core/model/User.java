package com.deepreader.core.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "users")
@Data
public class User {
    @Id
    private String id;

    @Indexed(unique = true)
    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không đúng định dạng")
    private String email;

    @JsonIgnore // Khi API trả về JSON, field này sẽ bị ẩn đi để bảo mật
    private String passwordHash;

    @NotBlank(message = "Tên không được để trống")
    private String fullName;

    @NotBlank(message = "Quyền (Role) không được để trống")
    private String role; // Ví dụ: ADMIN, USER

    @CreatedDate // Spring sẽ tự động điền thời gian lúc tạo record vào đây
    private LocalDateTime createdAt;
}