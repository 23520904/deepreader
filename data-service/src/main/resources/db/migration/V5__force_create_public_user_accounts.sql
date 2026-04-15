create table if not exists public.user_accounts (
    id bigserial primary key,
    email varchar(320) not null unique,
    password_hash text not null,
    full_name varchar(255),
    role varchar(32) not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_user_accounts_role
    on public.user_accounts(role);
