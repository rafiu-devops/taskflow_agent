import PerformanceClient from "./PerformanceClient";
import { getPerformanceDataScope } from "@/lib/auth/authorization";
import { requireAnyPagePermission } from "@/lib/auth/pageGuards";

export default async function PerformancePage() {
  const user = await requireAnyPagePermission([
    "PERFORMANCE_VIEW_MY",
    "PERFORMANCE_VIEW_DEPARTMENT",
    "PERFORMANCE_VIEW_ALL",
  ]);
  const scope = getPerformanceDataScope(user) ?? "own";
  return <PerformanceClient scope={scope} />;
}
