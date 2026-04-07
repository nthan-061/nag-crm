import { NOTE_PREFIX } from "@/lib/constants";

export function encodeLeadNote(content: string) {
  return `${NOTE_PREFIX}${content}`;
}

export function decodeLeadNote(content: string) {
  return content.startsWith(NOTE_PREFIX) ? content.slice(NOTE_PREFIX.length) : content;
}

export function isLeadNote(content: string) {
  return content.startsWith(NOTE_PREFIX);
}
