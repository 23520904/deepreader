package com.deepreader.business_service.model;

public record BookQueryRequest(
		String query,
		Integer limit,
		String provider
) {
}