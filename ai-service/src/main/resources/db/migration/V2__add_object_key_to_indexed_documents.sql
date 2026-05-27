alter table indexed_documents
    add column if not exists object_key text;
