# Dependency Cleanup Checklist

## 0) Baseline and Snapshot
- [x] Create branch `chore/dependency-cleanup`
- [x] Run baseline compile: `mvn -DskipTests compile`
- [x] Run baseline tests: `mvn test`
- [x] Capture current status: `git status`
- [x] Generate effective POM snapshot: `effective-pom.xml`

## 1) Inventory by Module
- [x] Generate dependency tree and analyze reports for:
  - [x] `core`
  - [x] `ai-service`
  - [x] `business-service`
  - [x] `data-service`
  - [x] `web-module`
- [x] Store reports under `docs/dependency-inventory/`

## 2) Package/Class Evidence Review
- [x] Search usage for `io.jsonwebtoken.*`
- [x] Search usage for `org.flywaydb.*`
- [x] Search usage for `org.springframework.data.redis.*`
- [x] Search usage for `io.grpc.*`, `com.google.protobuf.*`, `com.google.common.*`
- [x] Implement code usage where dependencies were only prepared

## 3) Safe Cleanup Cycle (one candidate at a time)
- [x] Remove and verify `web-module` Flyway dependencies
- [x] Remove and verify test dependencies from modules without tests
- [x] Attempt remove `ai-service` protobuf/guava; restore after compile failure
- [x] Mark rollback dependencies as `required-transitive`

## 4) Dependency Management Standardization
- [x] Reduce obvious duplicates and stale test/runtime dependencies
- [ ] Consolidate all shared versions into one central parent/BOM
- [ ] Align all module parents to shared `dependencyManagement` (future refactor)

## 5) Build Quality Gates
- [x] Enable Maven Enforcer rules in all Java modules:
  - [x] `dependencyConvergence`
  - [x] no non-internal snapshots (`requireReleaseDeps` with `com.deepreader:*` exclusion)
- [x] Add CI workflow for dependency hygiene with `dependency:analyze`
- [x] Fail CI when `Unused declared dependencies found`

## 6) Upgrade Review
- [x] Generate dependency update reports:
  - [x] `ai-service-updates.txt`
  - [x] `business-service-updates.txt`
  - [x] `web-module-updates.txt`
- [ ] Apply selected minor/patch upgrades (next controlled PR)
- [ ] Run local k6 smoke against running stack

## 7) Final Deliverables
- [x] Create `docs/dependency-cleanup-report.md`
- [ ] Measure artifact size and build-time delta before/after
- [x] Verify compile passes after cleanup
- [x] Verify tests pass with remaining useful tests
