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

@RestController
@RequestMapping(path = "/internal/data/v1/relational/users", produces = MediaType.APPLICATION_JSON_VALUE)
public class UserAccountJpaController {

	private final UserAccountJpaService service;

	public UserAccountJpaController(UserAccountJpaService service) {
		this.service = service;
	}

	@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	public Mono<UserAccountEntity> upsert(@Valid @RequestBody UserAccountUpsertRequest request) {
		return service.upsert(request);
	}

	@GetMapping
	public Flux<UserAccountEntity> listAll() {
		return service.listAll();
	}
}
