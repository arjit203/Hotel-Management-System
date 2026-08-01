import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import SignupForm from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create a 7 Vachan account to book faster and track your stays.",
  alternates: { canonical: "/signup" },
  robots: { index: false, follow: true },
};

export default function SignupPage() {
  return (
    <AuthShell title="Create Account" subtitle="Join 7 Vachan and enjoy exclusive offers">
      <SignupForm />
    </AuthShell>
  );
}
