import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <SignIn
      path="/sign-in"
      signUpUrl="/sign-up"
      forceRedirectUrl="/dashboard"
      appearance={{
        elements: {
          rootBox: "mx-auto",
          card: "rounded-3xl border border-border bg-card/80 shadow-xl backdrop-blur-xl",
        },
      }}
    />
  );
}
