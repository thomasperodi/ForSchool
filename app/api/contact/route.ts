import { NextResponse } from "next/server"
import nodemailer from "nodemailer"

export async function POST(req: Request) {
  const { name, email, message, subject } = await req.json()

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Dati mancanti" }, { status: 400 })
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.CONTACT_EMAIL, // esempio: skoollyapp@gmail.com
        pass: process.env.CONTACT_EMAIL_PASSWORD, // app password Gmail
      },
    })

    await transporter.sendMail({
      from: `"${name}" <${email}>`,
      to: "skoollyapp@gmail.com",
      subject: `Nuovo messaggio da ${name}`,
      text: message,
      html: `<p><strong>Nome:</strong> ${name}</p>
             <p><strong>Email:</strong> ${email}</p>
              <p><strong>Oggetto:</strong> ${subject}</p>
             <p><strong>Messaggio:</strong><br/>${message}</p>`,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Errore invio email:", error)
    return NextResponse.json({ error: "Errore server" }, { status: 500 })
  }
}
