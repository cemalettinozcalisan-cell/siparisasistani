export type OutboundChannelName = 'sms' | 'whatsapp' | 'instagram' | 'whatsapp_group';

export interface OutboundMessage {
  tenantId: string;
  channel: OutboundChannelName;
  /** Telefon / Instagram ID / Grup ID */
  to?: string;
  body: string;
  orderId?: string;
  customerId?: string;
  /** WhatsApp pazarlama şablonu (onaylı şablon) kullanılacaksa */
  templateId?: string;
  variables?: Record<string, string>;
}

export interface OutboundSendResult {
  success: boolean;
  provider?: string;
  providerMessageId?: string;
  error?: string;
}

export interface OutboundHealth {
  healthy: boolean;
  message: string;
  configured: boolean;
}

export interface OutboundChannel {
  readonly name: OutboundChannelName;
  isConfigured(tenantId: string): Promise<boolean>;
  send(message: OutboundMessage): Promise<OutboundSendResult>;
  healthCheck(tenantId?: string): Promise<OutboundHealth>;
}
