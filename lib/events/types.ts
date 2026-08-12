// PROPOSAL — target path: lib/events/types.ts (replaces existing file)
// Adds CustomerCreated (needed so the new webhook subscription system
// has something real to fire on — CUSTOMER_CREATED in the
// WebhookEvent enum had nothing backing it before this).

export interface DomainEvents {
  UserRegistered: { userId: string; workspaceId: string | null; email: string };
  WorkspaceCreated: { workspaceId: string; ownerId: string; businessType: string };
  MessageReceived: { workspaceId: string; conversationId: string; channel: "WHATSAPP" | "FACEBOOK" | "INSTAGRAM" };
  AiReplySent: { workspaceId: string; conversationId: string; customerId: string | null; confidence: "HIGH" | "MEDIUM" | "LOW" };
  KnowledgeUploaded: { workspaceId: string; fileId: string; chunksCreated: number };
  SubscriptionActivated: { workspaceId: string; plan: "PRO" };
  PaymentSucceeded: { workspaceId: string; amount: number; transactionId: string };
  PaymentFailed: { workspaceId: string; reason: string };
  AppointmentCreated: { workspaceId: string; appointmentId: string };
  BookingStatusChanged: { workspaceId: string; bookingId: string; status: string };
  CustomerCreated: { workspaceId: string; customerId: string };
  SupportTicketCreated: { workspaceId: string; ticketId: string; subject: string; createdByUserId: string };
  SupportTicketReplied: { workspaceId: string; ticketId: string; authorUserId: string; isAdminReply: boolean };
  SupportTicketClosed: { workspaceId: string; ticketId: string };
}

export type DomainEventName = keyof DomainEvents;
