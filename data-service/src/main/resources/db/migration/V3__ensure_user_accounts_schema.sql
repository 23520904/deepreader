create table if not exists user_accounts (
    id bigserial primary key,
    email varchar(320) not null unique,
    password_hash text not null,
    full_name varchar(255),
    role varchar(32) not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_user_accounts_role
    on user_accounts(role);

insert into user_accounts(email, password_hash, full_name, role)
values ('demo@deepreader.app', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHi6G6QmX6H3QvB4e5Qf0v5QJ5h2wYKu', 'DeepReader Demo', 'USER')
on conflict (email) do nothing;
