// types/sib-api-v3-sdk.d.ts

declare module 'sib-api-v3-sdk' {
  // Importa i tipi base da 'axios' solo se vuoi un typing minimale, altrimenti ignora
  export interface ApiKeyAuth {
    apiKey: string;
  }

  export interface SendSmtpEmailAttachment {
    name?: string;
    content?: string; // base64
  }

  export interface SendSmtpEmailTo {
    email: string;
    name?: string;
  }

  export interface SendSmtpEmail {
    sender?: { email: string; name?: string };
    to?: SendSmtpEmailTo[];
    replyTo?: { email: string; name?: string };
    subject?: string;
    htmlContent?: string;
    attachment?: SendSmtpEmailAttachment[];
  }

  export class ApiClient {
    static instance: ApiClient;
    authentications: Record<string, ApiKeyAuth>;
  }

  export class TransactionalEmailsApi {
    sendTransacEmail(email: SendSmtpEmail): Promise<{ messageId?: string }>;
  }

  const Brevo: {
    ApiClient: typeof ApiClient;
    TransactionalEmailsApi: typeof TransactionalEmailsApi;
  };

  export default Brevo;
}
