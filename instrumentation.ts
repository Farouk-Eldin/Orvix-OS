export async function register() {
  // Only in the Node.js runtime — this hook also fires for the edge
  // runtime, which our Prisma/BullMQ-backed listeners can't run in.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerAllListeners } = await import("@/lib/events/register-listeners");
    registerAllListeners();
  }
}
