package com.deepreader.data_service.service;

import com.deepreader.data_service.entity.UserAccountEntity;
import com.deepreader.data_service.model.UserAccountUpsertRequest;
import com.deepreader.data_service.repository.UserAccountJpaRepository;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.Objects;

@Service
public class UserAccountJpaService {

	private final UserAccountJpaRepository repository;

	public UserAccountJpaService(UserAccountJpaRepository repository) {
		this.repository = repository;
	}

	public Mono<UserAccountEntity> upsert(UserAccountUpsertRequest request) {
		return Mono.fromCallable(() -> repository.findByEmail(request.email())
						.map(existing -> {
							existing.setPasswordHash(request.passwordHash());
							existing.setFullName(request.fullName());
							existing.setRole(request.role());
							return existing;
						})
						.orElseGet(() -> {
							UserAccountEntity created = new UserAccountEntity();
							created.setEmail(request.email());
							created.setPasswordHash(request.passwordHash());
							created.setFullName(request.fullName());
							created.setRole(request.role());
							return created;
						}))
				.flatMap(entity -> Mono.fromCallable(() -> repository.save(entity)))
				.map(saved -> Objects.requireNonNull(saved, "saved user account must not be null"))
				.subscribeOn(Schedulers.boundedElastic());
	}

	public Flux<UserAccountEntity> listAll() {
		return Mono.fromCallable(repository::findAll)
				.flatMapMany(Flux::fromIterable)
				.subscribeOn(Schedulers.boundedElastic());
	}
}
