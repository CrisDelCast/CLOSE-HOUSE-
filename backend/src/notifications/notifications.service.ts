import { Injectable, Logger } from '@nestjs/common';
import { Twilio } from 'twilio';

interface VisitNotificationPayload {
  to?: string;
  visitorName: string;
  residentName?: string;
  unit?: string;
  purpose?: string;
  documentId?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly client?: Twilio;
  private readonly fromWhatsApp?: string;
  private readonly defaultToWhatsApp?: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromWhatsApp = process.env.TWILIO_WHATSAPP_FROM;
    const defaultToWhatsApp = process.env.TWILIO_WHATSAPP_DEFAULT_TO;

    this.fromWhatsApp = fromWhatsApp;
    this.defaultToWhatsApp = defaultToWhatsApp;

    if (accountSid && authToken && fromWhatsApp) {
      this.client = new Twilio(accountSid, authToken);
    } else {
      this.logger.log(
        'Twilio no configurado (faltan TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_WHATSAPP_FROM); notificaciones desactivadas.',
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
}
