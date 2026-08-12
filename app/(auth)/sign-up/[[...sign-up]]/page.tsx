import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <SignUp
      path="/sign-up"
      signInUrl="/sign-in"
      forceRedirectUrl="/onboarding"
      appearance={{
        elements: {
          rootBox: "mx-auto",
          card: "rounded-3xl border border-border bg-card/80 shadow-xl backdrop-blur-xl",
        },
      }}
    />
  );
}
