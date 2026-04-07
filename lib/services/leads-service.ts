import { deleteLead, listLeads } from "@/lib/repositories/leads-repository";

export async function getLeads() {
  return listLeads();
}

export async function removeLead(leadId: string) {
  return deleteLead(leadId);
}
