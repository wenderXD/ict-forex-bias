/* Build-time feature flags. NEXT_PUBLIC_ vars are inlined into both server
   and client bundles, so this is safe to import anywhere. Community features
   (auth-gated voting + chat) only light up once Clerk keys are present. */
export const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
