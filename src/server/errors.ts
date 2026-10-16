import type { ActionState } from "@/lib/action-state";

/** Erro de regra de negócio, exibido ao usuário. `field` aponta o campo do formulário. */
export class DomainError extends Error {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message);
  }
}

/** Converte um DomainError no retorno da action; outros erros seguem adiante. */
export function toActionState(error: unknown): ActionState {
  if (error instanceof DomainError) {
    return error.field
      ? { ok: false, fieldErrors: { [error.field]: error.message } }
      : { ok: false, message: error.message };
  }
  throw error;
}
