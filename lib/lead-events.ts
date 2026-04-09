export const LEAD_DELETED_STORAGE_KEY = "nag-crm:lead-deleted";

export function emitLeadDeleted(leadId: string) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    LEAD_DELETED_STORAGE_KEY,
    JSON.stringify({
      leadId,
      ts: Date.now()
    })
  );
}

