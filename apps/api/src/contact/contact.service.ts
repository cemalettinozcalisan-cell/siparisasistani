import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  async sendContact(form: { name: string; email: string; phone: string; message: string }) {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT || 587);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const toEmail = process.env.CONTACT_EMAIL || 'info@siparisasistani.com';

    if (!smtpHost || !smtpUser || !smtpPass) {
      this.logger.warn(`SMTP yapilandirilmadi. Iletisim formu: ${JSON.stringify(form)}`);
      return { success: true, fallback: true };
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: smtpUser,
      to: toEmail,
      subject: `İletişim Talebi: ${form.name} - SiparişAsistanı`,
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px">
          <h2 style="color:#4f46e5;margin:0 0 16px">Yeni İletişim Talebi</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;color:#64748b;font-size:13px">Ad Soyad</td><td style="padding:8px 0;color:#1e293b;font-weight:600;font-size:13px">${form.name}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:13px">E-posta</td><td style="padding:8px 0;color:#1e293b;font-weight:600;font-size:13px">${form.email}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:13px">Telefon</td><td style="padding:8px 0;color:#1e293b;font-weight:600;font-size:13px">${form.phone || '-'}</td></tr>
          </table>
          <div style="margin-top:16px;padding:12px;background:#fff;border-radius:8px;border:1px solid #e2e8f0">
            <p style="color:#64748b;font-size:12px;margin:0 0 8px">Mesaj:</p>
            <p style="color:#1e293b;font-size:13px;margin:0;white-space:pre-wrap">${form.message || '-'}</p>
          </div>
        </div>
      `,
    });

    this.logger.log(`Iletisim maili gonderildi: ${form.email}`);
    return { success: true };
  }
}
