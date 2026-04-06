import { getDashboardSnapshot } from "@/lib/repositories/dashboard-repository";

export async function getDashboardData() {
  return getDashboardSnapshot();
}
