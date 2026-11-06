import { getSession } from "@/lib/auth/session";
import { UnauthorizedError } from "@/lib/errors";

export async function requireSession(): Promise<{
  email: string;
  name: string | undefined;
  role: "admin" | "employee";
  employeeId: string | undefined;
}> {
  const session = await getSession();
  if (!session.email) throw new UnauthorizedError();
  return {
    email: session.email,
    name: session.name,
    role: session.role || "employee",
    employeeId: session.employeeId,
  };
}