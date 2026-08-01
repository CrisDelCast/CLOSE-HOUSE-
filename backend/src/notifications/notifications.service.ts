import { Body, Injectable, Logger, NotFoundException, Post } from '@nestjs/common';
import { Twilio } from 'twilio';
import { Resend } from 'resend';

interface VisitNotificationPayload {
  to?: string;
  visitorName: string;
  residentName?: string;
  unit?: string;
  purpose?: string;
  documentId?: string;
  email?: string;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly client?: Twilio;
  private readonly fromWhatsApp?: string;
  private readonly defaultToWhatsApp?: string;
  private readonly resend?: Resend;
  private readonly fromEmail?: string;
  private readonly defaultToEmail?: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromWhatsApp = process.env.TWILIO_WHATSAPP_FROM;
    const defaultToWhatsApp = process.env.TWILIO_WHATSAPP_DEFAULT_TO;
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM;
    const defaultToEmail = process.env.RESEND_DEFAULT_TO;

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

    if (resendApiKey && fromEmail) {
      this.resend = new Resend(resendApiKey);
      this.fromEmail = fromEmail;
      this.defaultToEmail = defaultToEmail;
      this.logger.log('Resend configurado para envío por API HTTP.');
    } else {
      this.logger.log(
        'Resend no configurado (faltan RESEND_API_KEY/RESEND_FROM); envío de correos desactivado.',
      );
    }
  }

  async notifyRoundAbandoned(email: string, roundId: string, notes?: string) {
    if (!email) {
      this.logger.warn('No se envió alerta de ronda abandonada: falta el correo del usuario.');
      return;
    }

    const notesSection = notes && notes.trim() 
      ? `\n\nReporte del guardia:\n"${notes}"` 
      : '\n\nNo se ingresó ningún reporte u observación por parte del guardia.';

    const correoFijo = 'Duxsbusiness2024@gmail.com';
    const subject = '⚠️ Alerta: Ronda de seguridad abandonada o expirada';
    const text = `Hola, te informamos que la ronda de seguridad con ID ${roundId} ha superado el tiempo límite permitido sin completarse y ha sido marcada por como abandonada en el sistema.${notesSection}`;
    
    // 1. Enviar al correo del guarda
    await this.sendEmail({
      to: email,
      subject,
      text,
    });
    
    // 2. Enviar al correo fijo de supervisión
    await this.sendEmail({
      to: correoFijo,
      subject,
      text,
    });
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

  async notifyApartmentResidents(
    residents: { email: string; fullName: string }[], 
    subject: string, 
    text: string,
    htmlContent?: string, 
    isHtml?: boolean      
  ) {
    for (const resident of residents) {
      if (resident.email) {
        const safeText = text && text !== 'undefined' 
          ? `Hola ${resident.fullName},\n\n${text}` 
          : `Hola ${resident.fullName},\n\nHas recibido una notificación importante en el sistema de portería. Por favor revisa tu correo en formato HTML.`;

        await this.sendEmail({
          to: resident.email,
          subject,
          text: safeText,
          html: isHtml && htmlContent ? htmlContent : undefined,
        });
      }
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
    html,
  }: SendEmailOptions): Promise<void> {
    if (!this.resend || !this.fromEmail) {
      this.logger.warn(
        `No se envió correo a ${to}: Resend no configurado o falta RESEND_FROM.`,
      );
      return;
    }

    try {
      const emailPayload: any = {
        from: this.fromEmail,
        to,
        subject,
        text,
      };

      if (html) {
        emailPayload.html = html;
        this.logger.log(`🟢 [DEBUG] Enviando correo con HTML adjunto para ${to}`);
      } else {
        this.logger.log(`🟡 [DEBUG] Enviando correo solo en texto plano para ${to}`);
      }

      const result = await this.resend.emails.send(emailPayload);

      if (result.error) {
        throw new Error(result.error.message);
      }

      this.logger.log(`Correo enviado a ${to} (id: ${result.data?.id ?? 'n/a'})`);
    } catch (error) {
      this.logger.error(
        `Error enviando correo a ${to}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}