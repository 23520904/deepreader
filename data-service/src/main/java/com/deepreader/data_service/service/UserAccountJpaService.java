package com.deepreader.data_service.service;

import com.deepreader.data_service.entity.UserAccountEntity;
import com.deepreader.data_service.model.UserAccountUpsertRequest;
import com.deepreader.data_service.repository.UserAccountJpaRepository;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.Objects;

/**
 * Service for managing user accounts stored with JPA.
 *
 * <p>JPA repository calls are blocking, so they are wrapped in Reactor types
 * and executed on boundedElastic.
 */
@Service
public class UserAccountJpaService {

	private final UserAccountJpaRepository repository;

	public UserAccountJpaService(UserAccountJpaRepository repository) {
		this.repository = repository;
	}

	/**
	 * Creates a new user account or updates an existing one with the same email.
	 *
	 * <p>Email is used as the lookup key so repeated requests update the same
	 * account instead of creating duplicates.
	 */
	public Mono<UserAccountEntity> upsert(UserAccountUpsertRequest request) {
		return Mono.fromCallable(() -> repository.findByEmail(request.email())
						.map(existing -> {
							// Update mutable account fields while keeping the existing database ID.
							existing.setPasswordHash(request.passwordHash());
							existing.setFullName(request.fullName());
							existing.setRole(request.role());
							return existing;
						})
						.orElseGet(() -> {
							// Create a new entity when no account exists for this email.
							UserAccountEntity created = new UserAccountEntity();
							created.setEmail(request.email());
							created.setPasswordHash(request.passwordHash());
							created.setFullName(request.fullName());
							created.setRole(request.role());
							return created;
						}))
				.flatMap(entity -> Mono.fromCallable(() -> repository.save(entity)))
				// Fail clearly if the repository unexpectedly returns null after saving.
				.map(saved -> Objects.requireNonNull(saved, "saved user account must not be null"))
				.subscribeOn(Schedulers.boundedElastic());
	}

	/**
	 * Lists all user accounts.
	 *
	 * <p>The blocking JPA findAll call is also moved to boundedElastic to avoid
	 * blocking the reactive event loop.
	 */
	public Flux<UserAccountEntity> listAll() {
		return Mono.fromCallable(repository::findAll)
				.flatMapMany(Flux::fromIterable)
				.subscribeOn(Schedulers.boundedElastic());
	}
}