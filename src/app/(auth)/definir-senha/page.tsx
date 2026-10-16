import type { Metadata } from "next";
import { SetPasswordForm } from "./set-password-form";

export const metadata: Metadata = { title: "Definir senha" };

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; convite?: string; error?: string }>;
}) {
  const { token, convite, error } = await searchParams;
  return <SetPasswordForm token={token ?? null} isInvite={convite === "1"} invalid={Boolean(error)} />;
}
