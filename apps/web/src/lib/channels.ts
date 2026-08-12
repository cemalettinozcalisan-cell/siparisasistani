export interface ChannelInfo {
  key: string;
  label: string;
  icon: string;
  gradient: string;
  color: string;
}

export const CHANNELS: Record<string, ChannelInfo> = {
  PHONE: { key: 'PHONE', label: 'Telefon', icon: 'phone', gradient: 'from-blue-500 to-blue-600', color: '#3b82f6' },
  WHATSAPP: { key: 'WHATSAPP', label: 'WhatsApp', icon: 'whatsapp', gradient: 'from-emerald-500 to-emerald-600', color: '#10b981' },
  INSTAGRAM: { key: 'INSTAGRAM', label: 'Instagram', icon: 'instagram', gradient: 'from-pink-500 to-pink-600', color: '#ec4899' },
  SMS: { key: 'SMS', label: 'SMS', icon: 'sms', gradient: 'from-sky-400 to-blue-500', color: '#38bdf8' },
  WEB: { key: 'WEB', label: 'Web Sitesi', icon: 'web', gradient: 'from-sky-500 to-sky-600', color: '#0ea5e9' },
};

export const CHANNEL_LIST = Object.values(CHANNELS);
