import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { isAdminEmail, normalizeEmail, findEmployeeByEmail } from "@/lib/auth/authorization";
import { AuthorizationUnavailableError } from "@/lib/errors";

function isActiveAccount(value: string | null | undefined): boolean {
  return String(value ?? "").trim().toLowerCase() === "active";
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(body?.email);
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Not authorised" }, { status: 401 });
    }

    if (isAdminEmail(email)) {
      const session = await getSession();
      session.email = email;
      session.name = email;
      session.role = "admin";
      session.employeeId = undefined;
      await session.save();
      return NextResponse.json({ ok: true, role: "admin" });
    }

    let employee;
    try {
      employee = await findEmployeeByEmail(email);
    } catch (error) {
      console.error("Unable to verify employee sign-in", error);
      throw new AuthorizationUnavailableError();
    }

    if (!employee || !isActiveAccount(employee.accountStatus)) {
      return NextResponse.json({ error: "Not authorised" }, { status: 401 });
    }

    const session = await getSession();
    session.email = email;
    session.name = employee.fullName || email;
    session.role = "employee";
    session.employeeId = employee.employeeId;
    await session.save();

    return NextResponse.json({ ok: true, role: "employee" });
  } catch (err) {
    if (err instanceof AuthorizationUnavailableError) {
      return NextResponse.json({ error: "Unable to verify access. Please try again later." }, { status: 503 });
    }
    console.error(err);
    return NextResponse.json({ error: "Sign-in failed" }, { status: 500 });
  }
}
