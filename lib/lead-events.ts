export const LEAD_DELETED_STORAGE_KEY = "nag-crm:lead-deleted";
export const LEAD_DELETED_EVENT = "nag-crm:lead-deleted";

// Emits to both same-tab listeners (CustomEvent) and other-tab listeners (localStorage).
export function emitLeadDeleted(leadId: string) {
  if (typeof window === "undefined") return;

  const payload = JSON.stringify({ leadId, ts: Date.now() });

  // Same-tab communication via CustomEvent
  window.dispatchEvent(new CustomEvent(LEAD_DELETED_EVENT, { detail: { leadId } }));

  // Cross-tab communication via localStorage (storage event only fires in other tabs)
  window.localStorage.setItem(LEAD_DELETED_STORAGE_KEY, payload);
}
