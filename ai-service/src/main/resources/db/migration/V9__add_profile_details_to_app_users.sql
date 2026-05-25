alter table app_users add column if not exists full_name varchar(120);
alter table app_users add column if not exists phone_number varchar(30);
alter table app_users add column if not exists location varchar(120);
