export interface PasswordResetEmail {
  email: string;
  url: string;
}

export type PasswordResetEmailSender = (message: PasswordResetEmail) => Promise<void>;

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
  };
}
