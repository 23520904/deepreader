package com.deepreader.data_service.controller;

import com.deepreader.data_service.entity.UserAccountEntity;
import com.deepreader.data_service.model.UserAccountUpsertRequest;
import com.deepreader.data_service.service.UserAccountJpaService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

/**
 * Internal controller for relational user account data.
 *
 * <p>This controller exposes simple endpoints for creating, updating, and listing
 * user accounts stored through the JPA-based service.
 */
@RestController
@RequestMapping(path = "/internal/data/v1/relational/users", produces = MediaType.APPLICATION_JSON_VALUE)
public class UserAccountJpaController {

	private final UserAccountJpaService service;

	public UserAccountJpaController(UserAccountJpaService service) {
		this.service = service;
	}

	/**
	 * Creates or updates a user account.
	 *
	 * <p>The request is validated before it reaches the service so required
	 * account fields are checked at the API boundary.
	 */
	@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	public Mono<UserAccountEntity> upsert(@Valid @RequestBody UserAccountUpsertRequest request) {
		return service.upsert(request);
	}

	/**
	 * Lists all relational user accounts.
	 */
	@GetMapping
	public Flux<UserAccountEntity> listAll() {
		return service.listAll();
	}
}