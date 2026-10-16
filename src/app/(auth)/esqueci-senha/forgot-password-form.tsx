"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);

    const { error } = await authClient.requestPasswordReset({
      email: String(form.get("email")),
      redirectTo: "/definir-senha",
    });

    setPending(false);
    if (error) {
      setError("Não foi possível enviar o e-mail. Tente novamente.");
      return;
    }
    setSent(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Esqueci a senha</CardTitle>
        <CardDescription>Enviaremos um link para você definir uma nova senha.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {sent ? (
          <Alert>
            <AlertDescription>
              Se o e-mail estiver cadastrado, você receberá o link em instantes.
            </AlertDescription>
          </Alert>
        ) : (
          <form method="post" onSubmit={onSubmit} className="flex flex-col gap-4">
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? "Enviando…" : "Enviar link"}
            </Button>
          </form>
        )}
        <Link href="/login" className="text-center text-sm text-muted-foreground hover:underline">
          Voltar para o login
        </Link>
      </CardContent>
    </Card>
  );
}
