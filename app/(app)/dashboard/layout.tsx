import { redirect } from "next/navigation";

import { getCurrentUserWithWorkspace } from "@/features/authentication/services/get-current-workspace";
import { Sidebar } from "@/features/dashboard/components/sidebar";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { GlobalStatusBar } from "@/features/dashboard/components/global-status-bar";
import { UpgradeModal } from "@/features/dashboard/components/upgrade-modal";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, workspace } = await getCurrentUserWithWorkspace();

  if (!user) redirect("/sign-in");
  if (!workspace) redirect("/onboarding");

  return (
    <div className="relative min-h-screen px-4 pb-16 pt-4 sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_10%_10%,var(--color-primary)/8%,transparent_40%)]"
      />
      <div className="mx-auto flex max-w-7xl gap-6">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <DashboardHeader workspaceName={workspace.name} />
          <GlobalStatusBar />
          {children}
        </div>
      </div>
      <UpgradeModal />
    </div>
  );
}
