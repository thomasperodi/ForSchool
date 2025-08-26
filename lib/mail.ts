import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  attachments?: { content: string; filename: string; type: string; disposition: string }[]
) => {
  try {
    await sgMail.send({
      to,
      from: { name: process.env.EMAIL_FROM_NAME!, email: process.env.EMAIL_FROM_ADDRESS! },
      replyTo: process.env.EMAIL_REPLY_TO!,
      subject,
      html,
      attachments,
    });
    console.log('Email inviata a', to);
  } catch (err) {
    console.error('Errore invio email:', err);
  }
};
