import { redirect } from "next/navigation";
import AssistantClient from "./AssistantClient";
import { requirePageUser } from "@/lib/auth/pageGuards";
import { hasPermission } from "@/lib/auth/authorization";

export default async function AssistantPage() {
  const user = await requirePageUser();
  if (user.role !== "admin" && !hasPermission(user, "ASSISTANT_EMPLOYEE_ACCESS")) {
    redirect("/access-denied");
  }
  return <AssistantClient role={user.role} />;
}
