-- Migration 007: allow common WhatsApp video MIME types in message media bucket.
-- Run this in the Supabase SQL Editor.

update storage.buckets
set allowed_mime_types = array[
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
  'application/octet-stream'
]
where id = 'message-media';
