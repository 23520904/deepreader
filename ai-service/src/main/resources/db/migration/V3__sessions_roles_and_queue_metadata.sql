alter table app_users
    add column if not exists role varchar(32) not null default 'USER';

create table if not exists auth_sessions (
    session_id varchar(100) primary key,
    user_id varchar(100) not null references app_users(user_id) on delete cascade,
    refresh_token varchar(200) not null unique,
    expires_at timestamptz not null,
    revoked boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_auth_sessions_user_id
    on auth_sessions(user_id, created_at desc);

alter table ingestion_jobs
    add column if not exists source_object_key text;
