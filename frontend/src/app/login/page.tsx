import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your 7 Vachan account to manage your bookings.",
  alternates: { canonical: "/login" },
  // Account pages carry no public value and shouldn't compete in search.
  robots: { index: false, follow: true },
};

/**
 * Now a Server Component: AuthShell fetches the backdrop photography and renders
 * the split layout, while the interactive form stays a Client Component.
 */
export default function LoginPage() {
  return (
    <AuthShell title="Welcome Back" subtitle="Login to continue your journey with 7 Vachan">
      <LoginForm />
    </AuthShell>
  );
}
