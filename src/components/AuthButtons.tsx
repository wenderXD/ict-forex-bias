"use client";
import { useUser, SignInButton, UserButton } from "@clerk/nextjs";

/* Only mounted when Clerk is configured (see Header), so the hooks always run
   inside a ClerkProvider. */
export default function AuthButtons() {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return <div className="h-7 w-7 rounded-full bg-border/50 animate-pulse" />;
  }

  if (isSignedIn) {
    return <UserButton />;
  }

  return (
    <SignInButton mode="modal">
      <button className="h-7 px-2.5 flex items-center text-xs font-mono border border-border hover:border-accent/60 hover:text-accent rounded transition-all text-text-secondary">
        Sign in
      </button>
    </SignInButton>
  );
}
