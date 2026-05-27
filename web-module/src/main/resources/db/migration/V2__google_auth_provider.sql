alter table if exists app_users
    add column if not exists auth_provider varchar(32) not null default 'LOCAL';

alter table if exists app_users
    add column if not exists provider_subject varchar(255);

create index if not exists idx_app_users_auth_provider
    on app_users(auth_provider);

create index if not exists idx_app_users_provider_subject
    on app_users(provider_subject)
    where provider_subject is not null;
