import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import EmailSettings from '@/models/EmailSettings.model';
import { createNodemailerClient } from '@/lib/email/nodemailerClient';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, subject, message } = body;

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields are required.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    await dbConnect();
    const settings = await EmailSettings.findOne().lean();

    if (!settings || !settings.isConfigured || !settings.gmailUser || !settings.gmailAppPassword) {
      return NextResponse.json(
        { error: 'Email system is not configured. Please contact support directly.' },
        { status: 503 }
      );
    }

    const transporter = createNodemailerClient(settings.gmailUser, settings.gmailAppPassword);

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; margin-top: 0;">New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
        <p><strong>Message:</strong></p>
        <div style="background: #f8fafc; padding: 12px; border-radius: 6px; white-space: pre-wrap;">${escapeHtml(message)}</div>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #64748b; font-size: 12px;">Submitted via GuardMate Contact Form</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"${settings.fromName || 'GuardMate'}" <${settings.fromEmail || settings.gmailUser}>`,
      to: settings.fromEmail || settings.gmailUser,
      replyTo: email,
      subject: `Contact Form: ${subject} — from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`,
      html: htmlBody,
    });

    return NextResponse.json(
      { success: true, message: 'Message sent. We will respond within 24 hours.' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[Contact Form] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send your message. Please try again later.' },
      { status: 500 }
    );
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
