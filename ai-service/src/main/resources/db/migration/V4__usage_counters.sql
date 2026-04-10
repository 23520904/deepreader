create table if not exists usage_counters (
    id bigserial primary key,
    user_id varchar(100) not null,
    metric_key varchar(80) not null,
    window_date date not null,
    value bigint not null default 0,
    updated_at timestamptz not null default now(),
    unique (user_id, metric_key, window_date)
);
