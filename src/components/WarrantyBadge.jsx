import React from "react";
import { ShieldCheck } from "lucide-react";
import { warrantyStatusStyle } from "@/lib/warrantyStatus";

// Warranty state for one unit. Renders nothing until a status is on file.
export default function WarrantyBadge({ status }) {
  if (!status) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md border ${warrantyStatusStyle(status)}`}>
      <ShieldCheck className="w-3 h-3" />
      {status}
    </span>
  );
}