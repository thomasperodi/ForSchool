// mail.ts – versione Brevo (Sendinblue)
import * as Brevo from 'sib-api-v3-sdk';

const client = Brevo.ApiClient.instance;
(client.authentications['api-key'] as Brevo.ApiKeyAuth).apiKey = process.env.BREVO_API_KEY!;

const tranEmailApi = new Brevo.TransactionalEmailsApi();

// Mantengo la stessa firma della tua funzione per evitare refactor altrove
export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  attachments?: { content: string; filename: string; type: string; disposition: string }[]
) => {
  try {
    // NB: Brevo richiede gli allegati in base64 in campo `content`
    const email: Brevo.SendSmtpEmail = {
      to: [{ email: to }],
      sender: {
        name: process.env.EMAIL_FROM_NAME!,
        email: process.env.EMAIL_FROM_ADDRESS!,
      },
      replyTo: {
        email: process.env.EMAIL_REPLY_TO!,
        name: process.env.EMAIL_FROM_NAME!,
      },
      subject,
      htmlContent: html,
      attachment: attachments?.map(a => ({
        name: a.filename,
        content: a.content, // deve essere BASE64
        // il MIME type e la disposition non sono necessari per l’SDK Brevo
      })),
    };

    const res = await tranEmailApi.sendTransacEmail(email);
    console.log('Email inviata a', to, 'messageId:', res?.messageId ?? '(n/d)');
  } catch (err) {
    console.error('Errore invio email (Brevo):', err);
  }
};
