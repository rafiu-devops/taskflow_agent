import ReportsClient from "./ReportsClient";
import { requireAnyPagePermission } from "@/lib/auth/pageGuards";

export default async function ReportsPage() {
  await requireAnyPagePermission([
    "REPORTS_VIEW_DASHBOARD",
    "REPORTS_VIEW_DEPARTMENT",
    "REPORTS_VIEW_ALL",
    "REPORTS_EXPORT",
  ]);
  return <ReportsClient />;
}
