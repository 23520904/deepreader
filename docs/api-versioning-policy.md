# API Versioning and Deprecation Policy

## Current version

- Stable public base path: `/api/v1` (gateway)
- Internal service base path: `/internal/{service}/v1`

## Deprecation behavior

Legacy public compatibility paths have been removed.

## Version governance rules

- Breaking changes require a new major API namespace (`/api/v2`).
- Additive changes are allowed in the current major version.
- Deprecated fields/endpoints must be announced at least 90 days before removal.
- Removal requires release notes and migration examples.
