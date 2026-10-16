"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { PASSWORD_MIN_LENGTH } from "@/lib/password";

type Props = { token: string | null; isInvite: boolean; invalid: boolean };

export function SetPasswordForm({ token, isInvite, invalid }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!token || invalid) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Link inválido ou expirado</CardTitle>
          <CardDescription>Peça um novo link para definir sua senha.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/esqueci-senha" className={buttonVariants({ size: "lg", className: "w-full" })}>
            Pedir novo link
          </Link>
        </CardContent>
      </Card>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    if (password !== String(form.get("confirm"))) {
      setError("As senhas não conferem.");
      return;
    }

    setPending(true);
    setError(null);
    const { error } = await authClient.resetPassword({ newPassword: password, token: token! });
    setPending(false);

    if (error) {
      setError(
        error.code === "INVALID_TOKEN"
          ? "Este link expirou ou já foi usado. Peça um novo."
          : "Não foi possível salvar a senha. Tente novamente.",
      );
      return;
    }
    toast.success("Senha definida. Faça login para continuar.");
    router.push("/login");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isInvite ? "Bem-vindo(a)!" : "Nova senha"}</CardTitle>
        <CardDescription>
          {isInvite ? "Defina a senha do seu primeiro acesso." : "Escolha uma nova senha."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={PASSWORD_MIN_LENGTH}
              required
            />
            <p className="text-xs text-muted-foreground">Mínimo de {PASSWORD_MIN_LENGTH} caracteres.</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm">Confirme a senha</Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              minLength={PASSWORD_MIN_LENGTH}
              required
            />
          </div>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Salvando…" : "Salvar senha"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
