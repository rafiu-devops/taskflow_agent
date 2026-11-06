import { redirect } from "next/navigation";
import {
  getCurrentUser,
  hasAnyPermission,
  hasPermission,
  type CurrentUser,
} from "@/lib/auth/authorization";
import type { PermissionKey } from "@/lib/auth/permissions";
import { AuthorizationUnavailableError, ForbiddenError, UnauthorizedError } from "@/lib/errors";

export async function requirePageUser(): Promise<CurrentUser> {
  try {
    return await getCurrentUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/login");
    if (error instanceof ForbiddenError || error instanceof AuthorizationUnavailableError) {
      redirect("/access-denied");
    }
    console.error("Unable to load current user", error);
    redirect("/access-denied");
  }
}

export async function requirePagePermission(permission: PermissionKey): Promise<CurrentUser> {
  const user = await requirePageUser();
  if (!hasPermission(user, permission)) redirect("/access-denied");
  return user;
}

export async function requireAnyPagePermission(permissions: readonly PermissionKey[]): Promise<CurrentUser> {
  const user = await requirePageUser();
  if (!hasAnyPermission(user, permissions)) redirect("/access-denied");
  return user;
}

export async function requireAdminPage(): Promise<CurrentUser> {
  const user = await requirePageUser();
  if (user.role !== "admin") redirect("/access-denied");
  return user;
}
