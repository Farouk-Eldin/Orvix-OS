import { Sparkles, Clock } from "lucide-react";

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; eta?: string }>;
}) {
  const { message, eta } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="glass-panel max-w-md rounded-3xl p-8 text-center shadow-sm">
        <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="size-6" />
        </span>
        <h1 className="text-xl font-bold">المنصة تحت الصيانة حاليًا</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {message || "بنعمل تحسينات سريعة وهنرجع قريب جدًا. حساباتك ومحادثاتك وبياناتك كلها محفوظة."}
        </p>
        {eta && (
          <div className="mt-4 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="size-4" />
            الوقت المتوقع: {eta}
          </div>
        )}
      </div>
    </div>
  );
}
