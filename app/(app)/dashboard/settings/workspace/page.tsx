import { WorkspaceSettingsForm } from "@/features/dashboard/components/workspace-settings-form";

export default function WorkspaceSettingsPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-bold">إعدادات النشاط</h1>
        <p className="text-sm text-muted-foreground">الاسم والشعار الأساسي</p>
      </div>
      <WorkspaceSettingsForm />
    </div>
  );
}
