package com.deepreader.data_service.repository;

import com.deepreader.data_service.entity.UserAccountEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserAccountJpaRepository extends JpaRepository<UserAccountEntity, Long> {
	Optional<UserAccountEntity> findByEmail(String email);
}
