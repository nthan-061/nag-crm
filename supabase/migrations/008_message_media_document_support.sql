-- Migration 008: allow CRM message uploads for common WhatsApp document types.
-- Run this in the Supabase SQL Editor.

update storage.buckets
set
  file_size_limit = 52428800,
  allowed_mime_types = array[
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
    'video/quicktime',
    'video/3gpp',
    'video/webm',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'text/plain',
    'application/octet-stream'
  ]
where id = 'message-media';
