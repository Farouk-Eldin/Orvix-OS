import { redirect } from "next/navigation";

import { getCurrentUserWithWorkspace } from "@/features/authentication/services/get-current-workspace";
import { OnboardingForm } from "@/features/onboarding/components/onboarding-form";

export default async function OnboardingPage() {
  const { user, workspace } = await getCurrentUserWithWorkspace();

  if (!user) {
    redirect("/sign-in");
  }
  if (workspace) {
    redirect("/dashboard");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_15%,var(--color-primary)/10%,transparent_45%),radial-gradient(circle_at_85%_25%,var(--color-primary)/8%,transparent_40%)]"
      />
      <OnboardingForm />
    </main>
  );
}
