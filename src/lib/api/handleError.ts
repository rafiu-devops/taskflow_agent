import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  AuthorizationUnavailableError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  WorkbookConflictError,
} from "@/lib/errors";

export function handleApiError(error: unknown, fallbackMessage: string): NextResponse {
  if (error instanceof ZodError) {
    const message = error.issues[0]?.message || "Invalid request data";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof WorkbookConflictError || error instanceof ConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  if (error instanceof AuthorizationUnavailableError) {
    return NextResponse.json({ error: "Authorization service unavailable" }, { status: 503 });
  }
  console.error(fallbackMessage, error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
