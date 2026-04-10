# Backup and Restore Runbook

## Scope

- PostgreSQL metadata database
- Qdrant vector collections
- S3-compatible object storage bucket (MinIO/S3)

## Backup procedure

### PostgreSQL

- Daily logical backup:
  - `pg_dump -Fc -h <host> -U <user> -d deepreader > deepreader_YYYYMMDD.dump`
- Keep at least 14 daily copies and 8 weekly copies.

### Qdrant

- Use Qdrant snapshots per collection on a daily schedule.
- Replicate snapshots to object storage or backup volume.

### Object storage

- Enable bucket versioning if supported.
- Nightly replication/copy to secondary bucket/region.

## Restore procedure

1. Restore PostgreSQL dump to clean instance.
2. Restore Qdrant snapshots.
3. Restore object bucket data.
4. Run smoke checks:
   - auth login
   - search
   - chat
   - document summary

## DR targets (initial)

- RPO: 24h
- RTO: 4h

## Incident notes template

- Incident start:
- Impact:
- Root cause:
- Recovery completed:
- Follow-up actions:
