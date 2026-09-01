import { jsPDF } from "jspdf";
import type { StaffMember } from "@/lib/staff/service";

export function generateStaffPdf(staff: StaffMember): Blob {
  const doc = new jsPDF();

  // Placeholder PDF until the final staff document format is provided.
  void staff;

  return doc.output("blob");
}

export function downloadStaffPdf(staff: StaffMember) {
  const blob = generateStaffPdf(staff);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${staff.name.trim().replace(/\s+/g, "-").toLowerCase() || "staff"}-profile.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
