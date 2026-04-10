# Observability Stack

## Components

- Prometheus scrape config: `observability/prometheus.yml`
- Alert rules (SLO): `observability/alerts.yml`
- Grafana dashboard seed: `observability/grafana-dashboard.json`

## Suggested deployment

- Run Prometheus + Grafana as separate services in staging/prod.
- Scrape `ai-service` metrics at `/actuator/prometheus`.
- Import dashboard JSON into Grafana.
- Wire Alertmanager (or cloud alerting) for SLO alerts.

## Initial SLOs

- Error rate `< 5%` over 5m window
- p95 latency `< 1.5s`
