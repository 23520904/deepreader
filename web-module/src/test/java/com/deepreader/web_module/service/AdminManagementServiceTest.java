package com.deepreader.web_module.service;

import com.deepreader.web_module.model.admin.AdminDtos;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AdminManagementServiceTest {
	private JdbcTemplate jdbcTemplate;
	private AdminManagementService adminManagementService;

	@BeforeEach
	void setUp() {
		DriverManagerDataSource dataSource = new DriverManagerDataSource();
		dataSource.setDriverClassName("org.h2.Driver");
		dataSource.setUrl("jdbc:h2:mem:" + UUID.randomUUID() + ";MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1");
		jdbcTemplate = new JdbcTemplate(dataSource);
		adminManagementService = new AdminManagementService(jdbcTemplate, new ObjectMapper());
		createSchema();
	}

	@Test
	void listUsersSupportsSearchRoleStatusAndPagination() {
		insertUser("user-1", "reader@example.com", "Reader", "USER", "ACTIVE");
		insertUser("user-2", "admin@example.com", "Admin", "ADMIN", "ACTIVE");
		insertUser("user-3", "banned@example.com", "Banned", "USER", "BANNED");

		AdminDtos.PageResponse<AdminDtos.AdminUserRow> page = adminManagementService.listUsers(
				"reader",
				"USER",
				"ACTIVE",
				0,
				10,
				"desc"
		);

		assertThat(page.total()).isEqualTo(1);
		assertThat(page.items()).hasSize(1);
		assertThat(page.items().getFirst().email()).isEqualTo("reader@example.com");
	}

	@Test
	void enforceAiQuotaRejectsWhenDailyRequestLimitIsReached() {
		insertUser("user-1", "reader@example.com", "Reader", "USER", "ACTIVE");
		jdbcTemplate.update("update app_users set daily_requests_limit = 1, daily_tokens_limit = 1000 where user_id = ?", "user-1");
		adminManagementService.recordAiUsage("user-1", "GROQ", null, 10, 10, 25, true);

		assertThatThrownBy(() -> adminManagementService.enforceAiQuota("user-1", 1))
				.isInstanceOf(IllegalStateException.class)
				.hasMessage("Daily AI request quota exceeded");
	}

	private void createSchema() {
		jdbcTemplate.execute("""
				create table app_users (
					user_id varchar(100) primary key,
					email varchar(320) not null unique,
					username varchar(80),
					avatar_url text,
					password_hash text not null default 'hash',
					role varchar(32) not null,
					status varchar(32) not null default 'ACTIVE',
					email_verified boolean not null default true,
					created_at timestamp with time zone not null default now(),
					daily_requests_limit integer,
					daily_tokens_limit integer,
					quota_disabled boolean not null default false
				)
				""");
		jdbcTemplate.execute("""
				create table indexed_documents (
					document_id varchar(100) primary key,
					user_id varchar(100) not null,
					file_name text not null,
					created_at timestamp with time zone not null default now()
				)
				""");
		jdbcTemplate.execute("""
				create table login_history (
					id bigserial primary key,
					user_id varchar(100),
					email varchar(320),
					ip_address varchar(80),
					user_agent text,
					login_time timestamp with time zone not null default now(),
					success boolean not null,
					failure_reason text
				)
				""");
		jdbcTemplate.execute("""
				create table ai_usage (
					id bigserial primary key,
					user_id varchar(100) not null,
					provider varchar(32) not null,
					model varchar(120),
					prompt_tokens integer not null default 0,
					completion_tokens integer not null default 0,
					total_tokens integer not null default 0,
					request_time timestamp with time zone not null default now(),
					latency_ms bigint not null default 0,
					success boolean not null default true
				)
				""");
	}

	private void insertUser(String userId, String email, String username, String role, String status) {
		jdbcTemplate.update(
				"insert into app_users (user_id, email, username, role, status) values (?, ?, ?, ?, ?)",
				userId,
				email,
				username,
				role,
				status
		);
	}
}
