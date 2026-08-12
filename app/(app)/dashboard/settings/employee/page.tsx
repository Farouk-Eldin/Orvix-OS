import { AiEmployeeForm } from "@/features/ai/components/ai-employee-form";

export default function AiEmployeeSettingsPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-bold">الموظف الذكي</h1>
        <p className="text-sm text-muted-foreground">شخصية المساعد وأسلوبه في الرد</p>
      </div>
      <AiEmployeeForm />
    </div>
  );
}
