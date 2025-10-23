// lib/mail.ts – Brevo via SMTP (Nodemailer)
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false, // usa 465 e secure:true se preferisci SSL
  auth: {
    user: process.env.BREVO_SMTP_USER!,
    pass: process.env.BREVO_SMTP_PASSWORD!,
  },
});

export type AttachmentIn = {
  content: string;  // base64
  filename: string;
  type?: string;
  disposition?: 'attachment' | 'inline'; // <--- CHANGE IS HERE
};

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  attachments?: AttachmentIn[]
) {
  transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME!}" <${process.env.EMAIL_FROM_ADDRESS!}>`,
    to,
    replyTo: process.env.EMAIL_REPLY_TO!,
    subject,
    html,
    attachments: attachments?.map(a => ({
      filename: a.filename,
      content: Buffer.from(a.content, 'base64'),
      contentType: a.type,
      contentDisposition: a.disposition, // Now correctly typed as 'attachment' | 'inline' | undefined
    })),
  });
}