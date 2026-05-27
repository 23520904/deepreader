create table if not exists password_reset_otps (
    id uuid primary key,
    email varchar(320) not null,
    otp_hash varchar(100) not null,
    expires_at timestamptz not null,
    attempts integer not null default 0,
    consumed_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists idx_password_reset_otps_email_created_at
    on password_reset_otps(email, created_at desc);

create index if not exists idx_password_reset_otps_email_active
    on password_reset_otps(email)
    where consumed_at is null;

create index if not exists idx_password_reset_otps_expires_at
    on password_reset_otps(expires_at);
