import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getEmployees } from "@/lib/excel/excelService";

function adminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Not authorised" }, { status: 401 });
    }

    const employees = await getEmployees();
    const match = employees.find((e) => (e.email || "").toLowerCase() === email);

    const admins = adminEmails();
    const isAdminEmail = admins.includes(email);

    let role: "admin" | "employee" = "employee";
    let employeeId: string | undefined;
    let name = email;

    if (match) {
      if (match.accountStatus !== "Active") {
        return NextResponse.json({ error: "Not authorised" }, { status: 401 });
      }
      name = match.fullName || email;
      employeeId = match.employeeId;
      role = isAdminEmail ? "admin" : "employee";
    } else if (employees.length === 0 && isAdminEmail) {
      // First-run bootstrap: allow admin to sign in with no employee records yet.
      role = "admin";
      name = email;
    } else {
      return NextResponse.json({ error: "Not authorised" }, { status: 401 });
    }

    const session = await getSession();
    session.email = email;
    session.name = name;
    session.role = role;
    session.employeeId = employeeId;
    await session.save();

    return NextResponse.json({ ok: true, role });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Sign-in failed" }, { status: 500 });
  }
}