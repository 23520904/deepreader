alter table if exists app_users
    add column if not exists email_verified boolean not null default false;

create table if not exists email_verification_otps (
    id uuid primary key,
    email varchar(320) not null,
    otp_hash varchar(100) not null,
    expires_at timestamptz not null,
    attempts integer not null default 0,
    consumed_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists idx_email_verification_otps_email_created_at
    on email_verification_otps(email, created_at desc);

create index if not exists idx_email_verification_otps_email_active
    on email_verification_otps(email)
    where consumed_at is null;

create index if not exists idx_email_verification_otps_expires_at
    on email_verification_otps(expires_at);
