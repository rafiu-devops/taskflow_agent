import ActivityLogsClient from "./ActivityLogsClient";
import { hasPermission } from "@/lib/auth/authorization";
import { requireAnyPagePermission } from "@/lib/auth/pageGuards";

export default async function ActivityLogsPage() {
  const user = await requireAnyPagePermission(["ACTIVITY_LOGS_VIEW", "ACTIVITY_LOGS_VIEW_MY"]);
  const scope = user.role === "admin" || hasPermission(user, "ACTIVITY_LOGS_VIEW") ? "organization" : "own";
  return <ActivityLogsClient scope={scope} />;
}
