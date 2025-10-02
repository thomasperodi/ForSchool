// File: app/api/support/route.ts

import { NextResponse } from 'next/server'
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export async function POST(req: Request) {
  try {
    const { name, email, subject, message } = await req.json()

    const html = `
      <h2>Richiesta di supporto</h2>
      <p><strong>Nome:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Oggetto:</strong> ${subject}</p>
      <p><strong>Messaggio:</strong></p>
      <p>${message}</p>
    `

    await sgMail.send({
      to: 'skoollyapp@gmail.com',
      from: { name: process.env.EMAIL_FROM_NAME!, email: process.env.EMAIL_FROM_ADDRESS! },
      replyTo: process.env.EMAIL_REPLY_TO!,
      subject: `📩 Nuova richiesta di supporto: ${subject}`,
      html,
    })

    console.log('Email inviata a skoollyapp@gmail.com')

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Errore invio email:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}