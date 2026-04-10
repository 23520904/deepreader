# API Versioning and Deprecation Policy

## Current version

- Stable base path: `/api/v1`
- Legacy compatibility paths (`/api/auth`, `/api/documents`) are deprecated.

## Deprecation behavior

Deprecated paths return headers:

- `Deprecation: true`
- `Sunset: Wed, 31 Dec 2026 23:59:59 GMT`
- `Link: </docs/api-versioning-policy.md>; rel="deprecation"`

## Version governance rules

- Breaking changes require a new major API namespace (`/api/v2`).
- Additive changes are allowed in the current major version.
- Deprecated fields/endpoints must be announced at least 90 days before removal.
- Removal requires release notes and migration examples.
