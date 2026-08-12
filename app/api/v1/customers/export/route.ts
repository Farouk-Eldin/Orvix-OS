import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { customerRepository } from "@/lib/repositories/customer.repository";
import { apiErrors } from "@/lib/api-response";

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  try {
    const { workspace } = await requireWorkspace();
    const customers = await customerRepository.listAllForExport(workspace.id);

    const headers = ["الاسم", "الهاتف", "الإيميل", "الشركة", "الحالة", "تاريخ التسجيل"];
    const rows = customers.map((c) =>
      [c.name, c.phone, c.email, c.company, c.status, c.createdAt.toISOString()].map(csvEscape).join(",")
    );
    // \uFEFF (UTF-8 BOM) so Excel opens Arabic text correctly instead of garbling it.
    const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="customers-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}
