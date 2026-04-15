# Release Checklist

- [ ] `monorepo-ci` green on `main`
- [ ] k6 workflow results attached and reviewed
- [ ] Flyway migrations applied in staging
- [ ] Backup snapshot created before prod rollout
- [ ] Prometheus targets all `UP`
- [ ] Grafana panel for p95 latency and error rate healthy
- [ ] Demo URL reachable and login flow works
