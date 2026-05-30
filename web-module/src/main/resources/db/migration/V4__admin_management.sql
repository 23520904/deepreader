alter table if exists app_users
    add column if not exists status varchar(32) not null default 'ACTIVE';

alter table if exists app_users
    add column if not exists daily_requests_limit integer;

alter table if exists app_users
    add column if not exists daily_tokens_limit integer;

alter table if exists app_users
    add column if not exists quota_disabled boolean not null default false;

create index if not exists idx_app_users_status
    on app_users(status);

create index if not exists idx_app_users_role_status_created_at
    on app_users(role, status, created_at desc);

create table if not exists login_history (
    id bigserial primary key,
    user_id varchar(100) references app_users(user_id) on delete set null,
    email varchar(320),
    ip_address varchar(80),
    user_agent text,
    login_time timestamptz not null default now(),
    success boolean not null,
    failure_reason text
);

create index if not exists idx_login_history_user_time
    on login_history(user_id, login_time desc);

create index if not exists idx_login_history_time
    on login_history(login_time desc);

create table if not exists ai_usage (
    id bigserial primary key,
    user_id varchar(100) not null references app_users(user_id) on delete cascade,
    provider varchar(32) not null,
    model varchar(120),
    prompt_tokens integer not null default 0,
    completion_tokens integer not null default 0,
    total_tokens integer not null default 0,
    request_time timestamptz not null default now(),
    latency_ms bigint not null default 0,
    success boolean not null default true
);

create index if not exists idx_ai_usage_user_time
    on ai_usage(user_id, request_time desc);

create index if not exists idx_ai_usage_request_time
    on ai_usage(request_time desc);

create index if not exists idx_ai_usage_provider_time
    on ai_usage(provider, request_time desc);

create table if not exists audit_log (
    id bigserial primary key,
    admin_user_id varchar(100) references app_users(user_id) on delete set null,
    action varchar(120) not null,
    target_user_id varchar(100) references app_users(user_id) on delete set null,
    metadata jsonb not null default '{}'::jsonb,
    timestamp timestamptz not null default now()
);

create index if not exists idx_audit_log_admin_time
    on audit_log(admin_user_id, timestamp desc);

create index if not exists idx_audit_log_target_time
    on audit_log(target_user_id, timestamp desc);

create index if not exists idx_audit_log_action_time
    on audit_log(action, timestamp desc);
