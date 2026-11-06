import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { downloadWorkbook } from "@/lib/google/driveClient";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  try {
    const { buffer } = await downloadWorkbook();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as any);
    const sheets = wb.worksheets.map((ws) => ({
      name: ws.name,
      rowCount: ws.rowCount,
    }));
    return NextResponse.json({ ok: true, sheets });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // Avoid leaking secrets; only expose a generic category.
    let category = "unknown";
    if (/Missing required environment variable/i.test(message)) category = "missing_config";
    else if (/404|not found/i.test(message)) category = "not_found_or_not_shared";
    else if (/invalid_grant/i.test(message)) category = "invalid_grant";
    else if (/private key|PEM|DECODER/i.test(message)) category = "invalid_private_key_format";
    else if (/Drive API|has not been used|disabled/i.test(message)) category = "drive_api_not_enabled";
    return NextResponse.json({ ok: false, category }, { status: 500 });
  }
}