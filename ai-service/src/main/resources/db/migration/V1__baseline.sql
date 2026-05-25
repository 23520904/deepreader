create table if not exists app_users (
    user_id varchar(100) primary key,
    email varchar(320) not null unique,
    username varchar(80),
    avatar_url text,
    full_name varchar(120),
    phone_number varchar(30),
    location varchar(120),
    password_hash text not null,
    created_at timestamptz not null default now()
);

create table if not exists indexed_documents (
    user_id varchar(100) not null references app_users(user_id) on delete cascade,
    document_id varchar(100) primary key,
    file_name text not null,
    created_at timestamptz not null default now()
);

create table if not exists indexed_document_sections (
    id bigserial primary key,
    document_id varchar(100) not null references indexed_documents(document_id) on delete cascade,
    section_order integer not null,
    section_id varchar(150) not null,
    title text not null,
    page_number integer not null,
    summary text,
    content text not null
);

create index if not exists idx_indexed_document_sections_document_id
    on indexed_document_sections(document_id, section_order);

create table if not exists ingestion_jobs (
    job_id varchar(100) primary key,
    user_id varchar(100) not null references app_users(user_id) on delete cascade,
    file_name text not null,
    status varchar(32) not null,
    error_message text,
    document_id varchar(100),
    idempotency_key varchar(200),
    attempts integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists uq_ingestion_jobs_user_idempotency
    on ingestion_jobs(user_id, idempotency_key)
    where idempotency_key is not null;

create index if not exists idx_ingestion_jobs_user_id
    on ingestion_jobs(user_id, created_at desc);

create table if not exists ingestion_job_dead_letters (
    id bigserial primary key,
    job_id varchar(100) not null,
    user_id varchar(100) not null,
    file_name text not null,
    error_message text not null,
    attempts integer not null,
    created_at timestamptz not null default now()
);

create table if not exists audit_logs (
    id bigserial primary key,
    user_id varchar(100),
    action varchar(120) not null,
    details text,
    created_at timestamptz not null default now()
);
