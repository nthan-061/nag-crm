-- Migration 006: message media metadata and private storage bucket.
-- Run this in the Supabase SQL Editor.

alter table public.messages
add column if not exists media_type text not null default 'text',
add column if not exists media_mime_type text,
add column if not exists media_file_name text,
add column if not exists media_url text,
add column if not exists media_storage_path text,
add column if not exists media_size bigint,
add column if not exists media_duration_seconds integer,
add column if not exists media_thumbnail text,
add column if not exists media_metadata jsonb not null default '{}'::jsonb;

alter table public.messages
drop constraint if exists messages_media_type_check;

alter table public.messages
add constraint messages_media_type_check
check (media_type in ('text', 'image', 'audio', 'video', 'document', 'sticker', 'contact', 'location', 'unknown'));

create index if not exists idx_messages_media_type
on public.messages(media_type);

create index if not exists idx_messages_media_storage_path
on public.messages(media_storage_path)
where media_storage_path is not null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-media',
  'message-media',
  false,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'audio/ogg',
    'audio/mpeg',
    'audio/mp4',
    'audio/aac',
    'audio/webm',
    'video/mp4',
    'application/pdf',
    'application/octet-stream'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
