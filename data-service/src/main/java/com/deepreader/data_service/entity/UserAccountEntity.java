package com.deepreader.data_service.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/**
 * JPA entity that maps application user accounts to the user_accounts table.
 */
@Entity
@Table(name = "user_accounts")
public class UserAccountEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	// Email is unique because it is used to identify one user account.
	@Column(nullable = false, unique = true)
	private String email;

	// Stores the hashed password only, never the raw password.
	@Column(name = "password_hash", nullable = false)
	private String passwordHash;

	@Column(name = "full_name")
	private String fullName;

	// Role controls what permissions the user has in the application.
	@Column(nullable = false)
	private String role;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	/**
	 * Sets the creation time automatically before the entity is first inserted.
	 *
	 * <p>The null check keeps an explicitly provided createdAt value unchanged.
	 */
	@PrePersist
	@SuppressWarnings("unused")
	void prePersist() {
		if (createdAt == null) {
			createdAt = LocalDateTime.now();
		}
	}

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public String getEmail() {
		return email;
	}

	public void setEmail(String email) {
		this.email = email;
	}

	public String getPasswordHash() {
		return passwordHash;
	}

	public void setPasswordHash(String passwordHash) {
		this.passwordHash = passwordHash;
	}

	public String getFullName() {
		return fullName;
	}

	public void setFullName(String fullName) {
		this.fullName = fullName;
	}

	public String getRole() {
		return role;
	}

	public void setRole(String role) {
		this.role = role;
	}

	public LocalDateTime getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(LocalDateTime createdAt) {
		this.createdAt = createdAt;
	}
}