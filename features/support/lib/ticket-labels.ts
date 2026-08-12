export const TICKET_STATUS_LABEL: Record<string, string> = {
  OPEN: "مفتوحة",
  IN_PROGRESS: "قيد المعالجة",
  RESOLVED: "تم الحل",
  CLOSED: "مغلقة",
};

export const TICKET_PRIORITY_LABEL: Record<string, string> = {
  LOW: "منخفضة",
  MEDIUM: "متوسطة",
  HIGH: "عالية",
  URGENT: "عاجلة",
};

/** shadcn Badge `variant` prop — used on the light customer-facing dashboard. */
export const TICKET_STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "outline" | "success" | "warning" | "destructive"> = {
  OPEN: "warning",
  IN_PROGRESS: "default",
  RESOLVED: "success",
  CLOSED: "secondary",
};

export const TICKET_PRIORITY_BADGE_VARIANT: Record<string, "default" | "secondary" | "outline" | "success" | "warning" | "destructive"> = {
  LOW: "outline",
  MEDIUM: "secondary",
  HIGH: "warning",
  URGENT: "destructive",
};

/** Raw Tailwind classes — the admin panel uses its own dark theme, not the shadcn Badge component. */
export const TICKET_STATUS_ADMIN_CLASS: Record<string, string> = {
  OPEN: "bg-amber-500/15 text-amber-400",
  IN_PROGRESS: "bg-blue-500/15 text-blue-400",
  RESOLVED: "bg-emerald-500/15 text-emerald-400",
  CLOSED: "bg-white/10 text-white/50",
};

export const TICKET_PRIORITY_ADMIN_CLASS: Record<string, string> = {
  LOW: "bg-white/10 text-white/50",
  MEDIUM: "bg-blue-500/15 text-blue-400",
  HIGH: "bg-amber-500/15 text-amber-400",
  URGENT: "bg-red-500/15 text-red-400",
};
