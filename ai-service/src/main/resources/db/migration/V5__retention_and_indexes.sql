create index if not exists idx_audit_logs_created_at
    on audit_logs(created_at desc);

create index if not exists idx_ingestion_dead_letters_created_at
    on ingestion_job_dead_letters(created_at desc);

create index if not exists idx_auth_sessions_updated_at
    on auth_sessions(updated_at desc);

create index if not exists idx_usage_counters_window_date
    on usage_counters(window_date desc);

create or replace function cleanup_old_operational_data(
    audit_days integer,
    dead_letter_days integer,
    session_days integer,
    usage_days integer
) returns void as $$
begin
    delete from audit_logs
    where created_at < now() - make_interval(days => audit_days);

    delete from ingestion_job_dead_letters
    where created_at < now() - make_interval(days => dead_letter_days);

    delete from auth_sessions
    where updated_at < now() - make_interval(days => session_days);

    delete from usage_counters
    where window_date < current_date - usage_days;
end;
$$ language plpgsql;
