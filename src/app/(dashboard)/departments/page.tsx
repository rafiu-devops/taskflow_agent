import DepartmentsClient from "./DepartmentsClient";
import { requirePagePermission } from "@/lib/auth/pageGuards";

export default async function DepartmentsPage() {
  await requirePagePermission("DEPARTMENTS_VIEW");
  return <DepartmentsClient />;
}
