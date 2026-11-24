export interface PasswordResetEmail {
  email: string;
  url: string;
}

export interface PasswordResetEmailAccepted {
  providerAccepted: true;
  providerMessageId?: string;
}

export type PasswordResetEmailSender = (message: PasswordResetEmail) => Promise<PasswordResetEmailAccepted>;

export function createResendPasswordResetEmailSender(options: {
  apiKey?: string;
  from?: string;
  fetcher?: typeof fetch;
} = {}): PasswordResetEmailSender {
  const apiKey = options.apiKey ?? process.env.RESEND_API_KEY;
  const from = options.from ?? process.env.RESEND_FROM_EMAIL;
  const fetcher = options.fetcher ?? fetch;

  return async ({ email, url }) => {
    if (!apiKey?.trim() || !from?.trim()) throw new Error("El correo de recuperación no está configurado.");
    const response = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Recupera el acceso docente de Fragments",
        text: `Usa este enlace seguro para establecer una contraseña nueva: ${url}\n\nSi no solicitaste este cambio, ignora este correo.`,
      }),
    });
    if (!response.ok) throw new Error("Resend no aceptó el correo de recuperación.");
    let providerMessageId: string | undefined;
    try {
      const payload: unknown = await response.json();
      if (payload && typeof payload === "object" && "id" in payload && typeof payload.id === "string") {
        providerMessageId = payload.id;
      }
    } catch {
      // HTTP 2xx confirms provider acceptance; response details are intentionally discarded.
    }
    return { providerAccepted: true, ...(providerMessageId ? { providerMessageId } : {}) };
  };
}
