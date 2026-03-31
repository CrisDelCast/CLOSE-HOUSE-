import { Injectable, Logger } from '@nestjs/common';
import { Twilio } from 'twilio';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface VisitNotificationPayload {
  to?: string;
  visitorName: string;
  residentName?: string;
  unit?: string;
  purpose?: string;
  documentId?: string;
  email?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly client?: Twilio;
  private readonly fromWhatsApp?: string;
  private readonly defaultToWhatsApp?: string;
  private readonly mailTransport?: Transporter;
  private readonly fromEmail?: string;
  private readonly defaultToEmail?: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromWhatsApp = process.env.TWILIO_WHATSAPP_FROM;
    const defaultToWhatsApp = process.env.TWILIO_WHATSAPP_DEFAULT_TO;
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT
      ? Number(process.env.SMTP_PORT)
      : undefined;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpSecure =
      process.env.SMTP_SECURE?.toLowerCase() === 'true' || false;
    const fromEmail = process.env.SMTP_FROM;
    const defaultToEmail = process.env.SMTP_DEFAULT_TO;

    this.fromWhatsApp = fromWhatsApp
      ? this.normalizeWhatsApp(fromWhatsApp)
      : undefined;
    this.defaultToWhatsApp = defaultToWhatsApp;
    this.fromEmail = fromEmail;
    this.defaultToEmail = defaultToEmail;

    if (accountSid && authToken && fromWhatsApp) {
      this.client = new Twilio(accountSid, authToken);
    } else {
      this.logger.log(
        'Twilio no configurado (faltan TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_WHATSAPP_FROM); notificaciones desactivadas.',
      );
    }

    if (smtpHost && smtpPort && fromEmail) {
      this.mailTransport = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth:
          smtpUser && smtpPass
            ? {
                user: smtpUser,
                pass: smtpPass,
              }
            : undefined,
      });

      this.logger.log(
        `SMTP configurado: host=${smtpHost} port=${smtpPort} secure=${smtpSecure} auth=${smtpUser ? 'on' : 'off'}`,
      );
    } else {
      this.logger.log(
        'SMTP no configurado (faltan SMTP_HOST/SMTP_PORT/SMTP_FROM); envío de correos desactivado.',
      );
    }
  }

  async notifyVisitArrival(payload: VisitNotificationPayload) {
    const to = payload.to ?? this.defaultToWhatsApp;
    if (!to) {
      this.logger.warn(
        'No se envió notificación de visita: no hay número destino (resident.phone o TWILIO_WHATSAPP_DEFAULT_TO).',
      );
      return;
    }

    const body = this.buildVisitMessage(payload);
    await this.sendWhatsApp(to, body);

    const emailTo = payload.email ?? this.defaultToEmail;
    if (emailTo) {
      await this.sendEmail({
        to: emailTo,
        subject: 'Llegó una visita',
        text: body,
      });
    } else {
      this.logger.warn(
        'No se envió correo de visita: no hay email destino (resident.email o SMTP_DEFAULT_TO).',
      );
    }
  }

  private buildVisitMessage({
    residentName,
    visitorName,
    unit,
    purpose,
    documentId,
  }: VisitNotificationPayload) {
    const parts = [
      residentName ? `Hola ${residentName},` : 'Hola,',
      `tienes una visita: ${visitorName}.`,
      documentId ? `Doc: ${documentId}.` : '',
      purpose ? `Motivo: ${purpose}.` : '',
      unit ? `Unidad: ${unit}.` : '',
      'Estado: pendiente de autorización.',
    ].filter(Boolean);

    return parts.join(' ');
  }

  private async sendWhatsApp(to: string, body: string) {
    const toWhatsApp = this.normalizeWhatsApp(to);

    if (!this.client || !this.fromWhatsApp) {
      this.logger.warn(
        `No se envió WhatsApp a ${toWhatsApp}: cliente Twilio no inicializado.`,
      );
      return;
    }

    try {
      await this.client.messages.create({
        from: this.fromWhatsApp,
        to: toWhatsApp,
        body,
      });
    } catch (error) {
      this.logger.error(
        `Error enviando WhatsApp a ${toWhatsApp}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private normalizeWhatsApp(phone: string) {
    return phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`;
  }

  private async sendEmail({
    to,
    subject,
    text,
  }: {
    to: string;
    subject: string;
    text: string;
  }) {
    if (!this.mailTransport || !this.fromEmail) {
      this.logger.warn(
        `No se envió correo a ${to}: transporte SMTP no configurado.`,
      );
      return;
    }

    this.logger.log(
      `Intentando enviar correo: to=${to} from=${this.fromEmail} subject="${subject}"`,
    );

    try {
      await this.mailTransport.sendMail({
        from: this.fromEmail,
        to,
        subject,
        text,
      });
      this.logger.log(`Correo enviado a ${to}`);
    } catch (error) {
      this.logger.error(
        `Error enviando correo a ${to}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
