import { Phone, Instagram, MessageSquare, Globe } from 'lucide-react';
import type { ComponentType } from 'react';

export type ChannelIconType = ComponentType<{ size?: number | string; className?: string }>;

// Gerçek WhatsApp logosu (beyaz balon) — dashboard ile aynı
export function WhatsAppIcon({ size = 20, className = '' }: { size?: number | string; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99 0-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.285-.143-1.689-.834-1.951-.929-.263-.095-.454-.143-.645.143-.191.285-.74.929-.907 1.12-.167.19-.334.214-.619.071-.285-.143-1.206-.444-2.298-1.417-.85-.758-1.424-1.693-1.591-1.979-.167-.285-.018-.439.125-.581.129-.128.285-.334.428-.5.143-.167.191-.285.285-.477.095-.192.048-.358-.024-.5-.071-.143-.645-1.554-.883-2.126-.232-.557-.468-.481-.644-.49-.167-.008-.358-.01-.549-.01-.191 0-.501.071-.763.358-.263.285-1.002.978-1.002 2.385 0 1.407 1.026 2.768 1.169 2.959.143.191 2.019 3.084 4.891 4.324.683.295 1.217.472 1.633.604.687.218 1.312.187 1.806.113.551-.083 1.689-.69 1.928-1.358.238-.668.238-1.24.167-1.358-.071-.118-.262-.19-.547-.333z" />
    </svg>
  );
}

// Kanal meta — dashboard renkleriyle birebir
export const CHANNEL_META: Record<string, { icon: ChannelIconType; bg: string }> = {
  phone: { icon: Phone, bg: 'bg-blue-500' },
  whatsapp: { icon: WhatsAppIcon, bg: 'bg-emerald-500' },
  instagram: { icon: Instagram, bg: 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600' },
  sms: { icon: MessageSquare, bg: 'bg-orange-500' },
  web: { icon: Globe, bg: 'bg-cyan-500' },
  website: { icon: Globe, bg: 'bg-cyan-500' },
  voice: { icon: Phone, bg: 'bg-blue-500' },
};

export function ChannelIcon({ channel, size = 16, className = 'text-white' }: { channel: string; size?: number; className?: string }) {
  const meta = CHANNEL_META[channel] || CHANNEL_META.phone;
  const Icon = meta.icon;
  return <Icon size={size} className={className} />;
}