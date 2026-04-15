# Free Cloud Deployment Plan

## Recommended free services
- Web/API hosting: Render free web services
- PostgreSQL: Neon free tier
- MongoDB: Atlas M0
- Kafka: Upstash Kafka free tier
- Redis: Upstash Redis free tier
- Object storage: Cloudflare R2 free tier
- Monitoring: Grafana Cloud free

## Service mapping
- `web-module`, `business-service`, `data-service`, `ai-service` -> Render
- `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD` -> Neon
- `MONGODB_URI` -> Atlas
- `KAFKA_BOOTSTRAP_SERVERS` -> Upstash Kafka endpoint
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` -> Upstash Redis
- `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET` -> R2

## Demo URL target
- Public gateway should expose `web-module` URL, example:
  - `https://deepreader-web.onrender.com`
