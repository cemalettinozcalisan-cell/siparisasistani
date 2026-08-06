import { Controller, Get, Param } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';

@Controller('replay')
export class ReplayController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get('order/:orderId')
  async getOrderReplay(@Param('orderId') orderId: string) {
    const [order, aiEvents, logs] = await Promise.all([
      this.supabase.db.from('orders').select('*, customer:customer_id(name, phone)').eq('id', orderId).single(),
      this.supabase.db.from('ai_events').select('*').eq('order_id', orderId).order('created_at'),
      this.supabase.db.from('activity_logs').select('*').eq('entity_id', orderId).order('created_at'),
    ]);

    return { order: order.data, aiEvents: aiEvents.data || [], timeline: logs.data || [] };
  }

  @Get('conversation/:orderId')
  async getConversation(@Param('orderId') orderId: string) {
    // Mock conversation data for demo/test orders
    if (orderId.startsWith('ord-') || orderId === 'demo-order') {
      const mockTranscripts: Record<string, string[]> = {
        'ord-016': ['Müşteri: Selamun aleykum, 2 kilo kangal sucuk istiyorum', 'AI: Aleykum selam efendim, 2 kg Kangal Sucuk not ettim. Başka bir şey ister misiniz?', 'Müşteri: Yok sağol', 'AI: Siparişiniz 1.500 TL. Teslimat adresinizi alabilir miyim?', 'Müşteri: Konya Selçuklu Mah.', 'AI: Not ettim. Ödeme yönteminiz?', 'Müşteri: IBAN\'a göndereyim', 'AI: IBAN bilgimiz: TR12 0001 2345 6789 0001 2345 67. Siparişiniz oluşturuldu. Teşekkür ederiz!'],
        'ord-017': ['Müşteri: Merhaba acılı sucuk var mı', 'AI: Merhaba efendim, evet Acılı Parmak Sucuk mevcut, 920 TL/kg. Ne kadar istersiniz?', 'Müşteri: 2 kilo alayım', 'AI: 2 kg Acılı Parmak Sucuk, toplam 1.840 TL. Adresinizi alabilir miyim?', 'Müşteri: Aydın Nazilli', 'AI: Not ettim. Ödemeyi nasıl yaparsınız?', 'Müşteri: Kapıda nakit vereyim', 'AI: Kapıda nakit onaylandı. Acele gönderilsin notunuzu ekledim. Siparişiniz hazırlanıyor!'],
        'ord-019': ['Müşteri: Alo kolay gelsin', 'AI: Kolay gelsin efendim, Ahmet İpek Sucukları\'na hoş geldiniz. Buyurun sizi dinliyorum.', 'Müşteri: 1 kilo pastırma, 1 kilo kangal, 1 kilo haşhaş ezmesi alacağım', 'AI: Not ettim: 1 KG Pastırma (1.200 TL), 1 KG Kangal Sucuk (750 TL), 1 KG Haşhaş Ezmesi (300 TL). Toplam 2.250 TL. Adresiniz?', 'Müşteri: Afyon merkez', 'AI: Afyon merkez, not ettim. Yarın teslim notunuzu da ekledim. Ödemeyi nasıl yaparsınız?', 'Müşteri: IBAN\'a atarım', 'AI: IBAN: TR12 0001 2345 6789 0001 2345 67. Ödemenizi yapınca dekontu WhatsApp\'tan iletmeniz yeterli. İyi günler!'],
        'ord-020': ['Müşteri: 2 kg dana parmak sucuk', 'AI: Merhaba, 2 kg Dana Parmak Sucuk not ettim. 890 TL/kg, toplam 1.780 TL. Başka ister misiniz?', 'Müşteri: Yok bu kadar', 'AI: Teslimat adresinizi alabilir miyim?', 'Müşteri: Ankara Çankaya', 'AI: Not ettim. Ödemeyi nasıl yaparsınız?', 'Müşteri: Kapıda nakit', 'AI: Kapıda nakit onaylandı. Siparişiniz hazırlanıyor, teşekkür ederiz! ✅'],
        'ord-021': ['Müşteri: Acılı sucuk kaç para', 'AI: Acılı Parmak Sucuk 920 TL/kg. Kaç kilo istersiniz?', 'Müşteri: 1 kilo', 'AI: 1 KG Acılı Parmak Sucuk 920 TL. Adresiniz?', 'Müşteri: İzmir Bornova', 'AI: Not ettim. Ödeme nasıl?', 'Müşteri: Linkten ödeyeyim', 'AI: Ödeme linkinizi gönderiyorum. Siparişiniz hazır!'],
      };
      const lines = mockTranscripts[orderId] || [
        'Müşteri: Merhaba, sipariş vermek istiyorum',
        'AI: Tabii efendim, buyurun sizi dinliyorum. Ne sipariş etmek istersiniz?',
        'Müşteri: 2 kg dana parmak sucuk ve 1 kg pastırma',
        'AI: Not ettim: 2 KG Dana Parmak Sucuk (1.780 TL) + 1 KG Pastırma (1.200 TL) = 2.980 TL. Adresinizi alabilir miyim?',
        'Müşteri: İstanbul Kadıköy',
        'AI: İstanbul Kadıköy, not ettim. Ödeme yönteminiz nedir?',
        'Müşteri: IBAN\'a havale yapayım',
        'AI: IBAN: TR12 0001 2345 6789 0001 2345 67. Siparişiniz oluşturuldu, teşekkür ederiz!',
      ];
      return {
        order: { order_number: orderId },
        transcript: lines.map((line) => {
          const [role, ...msg] = line.split(':');
          return { role: role.trim() === 'Müşteri' ? 'customer' : 'assistant', content: msg.join(':').trim() };
        }),
        audits: [{ confidence: 94, success: true, model: 'deepseek-chat', latency_ms: 2400 }],
      };
    }

    const { data: order } = await this.supabase.db
      .from('orders')
      .select('id, order_number, ai_transcript, ai_confidence, customer_note, created_at')
      .eq('id', orderId)
      .single();

    if (!order) return { error: 'Order not found' };

    const { data: audits } = await this.supabase.db
      .from('ai_audit_logs')
      .select('*')
      .eq('tenant_id', (await this.supabase.db.from('orders').select('tenant_id').eq('id', orderId).single()).data?.tenant_id)
      .order('created_at', { ascending: true })
      .limit(20);

    const transcript = order.ai_transcript
      ? order.ai_transcript.split('\n').map((line: string) => {
          const [role, ...msg] = line.split(':');
          return { role: role.trim().toLowerCase(), content: msg.join(':').trim() };
        })
      : [];

    return {
      order,
      transcript,
      audits: audits || [],
    };
  }
}
