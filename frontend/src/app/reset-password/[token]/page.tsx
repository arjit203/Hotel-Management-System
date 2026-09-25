import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Choose a new password for your 7 Vachan account.",
  // A per-user token page — never indexed, never followed.
  robots: { index: false, follow: false },
};

/**
 * Target of the emailed reset link: `${FRONTEND_URL}/reset-password/<token>`
 * (built in `forgotPasswordGeneric`, auth.service.ts). Until this page existed
 * that link returned a 404.
 */
export default function ResetPasswordPage({ params }: { params: { token: string } }) {
  return (
    <AuthShell title="Reset Password" subtitle="Choose a new password for your account">
      <ResetPasswordForm token={params.token} />
    </AuthShell>
  );
}
