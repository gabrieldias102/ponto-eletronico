import "server-only";
import { Resend } from "resend";

type Email = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Envia um e-mail pelo Resend. Sem RESEND_API_KEY (desenvolvimento), o conteúdo é
 * exibido no console do servidor.
 */
export async function sendEmail(email: Email) {
  if (!resend) {
    console.info(
      `\n[email] Para: ${email.to}\n[email] Assunto: ${email.subject}\n${email.text}\n`,
    );
    return;
  }

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Pontual <nao-responda@pontual.app>",
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });

  if (error) throw new Error(`Falha ao enviar e-mail: ${error.message}`);
}

function layout(title: string, body: string, action: { label: string; url: string }) {
  return `<!doctype html>
<html lang="pt-BR">
  <body style="font-family: system-ui, sans-serif; background: #f5f5f5; padding: 24px; color: #171717;">
    <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px;">
      <p style="font-weight: 700; font-size: 18px; margin: 0 0 24px;">Pontual</p>
      <h1 style="font-size: 20px; margin: 0 0 12px;">${title}</h1>
      <p style="line-height: 1.5; margin: 0 0 24px;">${body}</p>
      <a href="${action.url}" style="display: inline-block; background: #0d9488; color: #fff; text-decoration: none; padding: 10px 18px; border-radius: 8px;">${action.label}</a>
      <p style="font-size: 12px; color: #737373; margin: 24px 0 0;">Se o botão não funcionar, copie este link: ${action.url}</p>
    </div>
  </body>
</html>`;
}

export function inviteEmail(params: { name: string; organization: string; url: string }): Omit<Email, "to"> {
  const body = `Olá, ${params.name}! Você foi cadastrado(a) no sistema de ponto da ${params.organization}. Defina sua senha para acessar.`;
  return {
    subject: `Seu acesso ao Pontual — ${params.organization}`,
    html: layout("Bem-vindo(a) ao Pontual", body, { label: "Definir senha", url: params.url }),
    text: `${body}\n\nDefinir senha: ${params.url}`,
  };
}

export function resetPasswordEmail(params: { name: string; url: string }): Omit<Email, "to"> {
  const body = `Olá, ${params.name}! Recebemos um pedido para redefinir sua senha. Se não foi você, ignore este e-mail.`;
  return {
    subject: "Redefinição de senha — Pontual",
    html: layout("Redefinir senha", body, { label: "Redefinir senha", url: params.url }),
    text: `${body}\n\nRedefinir senha: ${params.url}`,
  };
}
