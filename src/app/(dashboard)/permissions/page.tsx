import PermissionManagementClient from "./PermissionManagementClient";
import { requireAdminPage } from "@/lib/auth/pageGuards";

export default async function PermissionManagementPage() {
  await requireAdminPage();
  return <PermissionManagementClient />;
}
