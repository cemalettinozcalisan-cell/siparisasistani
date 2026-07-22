export interface KnowledgeArticle {
  id: string;
  tenantId: string;
  category: string;
  title: string;
  content: string;
  active: boolean;
  sortOrder: number;
}

export interface TenantSettings {
  voiceGender: string;
  voiceSpeed: number;
  printerEnabled: boolean;
  whatsappGroupEnabled: boolean;
  whatsappFollowupEnabled: boolean;
  ibanEnabled: boolean;
  paymentLinkEnabled: boolean;
  websiteRedirectEnabled: boolean;
  humanTransferEnabled: boolean;
  callbackEnabled: boolean;
  recordCalls: boolean;
  recordWhatsapp: boolean;
  aiTone: string;
  aiStyle: string;
  aiProvider: string;
  aiModel: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
}
