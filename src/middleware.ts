import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

/* Clerk middleware only engages when keys are present; otherwise it's a no-op
   so the site runs normally without any auth configuration. Routes stay public
   either way — sign-in is enforced at the action level, not here. */
const enabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default enabled ? clerkMiddleware() : (_req: NextRequest) => NextResponse.next();

export const config = {
  matcher: [
    // Skip Next internals and static files, run on everything else + API routes.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
