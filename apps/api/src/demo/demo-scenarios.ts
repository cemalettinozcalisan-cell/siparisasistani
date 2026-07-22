export interface DemoSceanrio {
  id: string;
  name: string;
  description: string;
  steps: DemoStep[];
}

export interface DemoStep {
  userMessage: string;
  aiReply: string;
  confidence: number;
  action?: 'continue' | 'confirm' | 'order_created' | 'human_transfer' | 'end';
  orderNumber?: string;
}

export const DEMO_SCENARIOS: DemoSceanrio[] = [
  {
    id: 'sucuk-basit',
    name: 'Basit Sucuk Siparişi',
    description: 'Müşteri tek ürün sipariş eder, hızlı onay verir',
    steps: [
      { userMessage: '', aiReply: 'Merhaba, Ahmet İpek Sucukları Yapay Zekâ Sipariş Hattı\'na hoş geldiniz. Size nasıl yardımcı olabilirim?', confidence: 100, action: 'continue' },
      { userMessage: '2 kilo dana parmak sucuk istiyorum', aiReply: 'Hı hı... Anladım. 2 kilogram dana parmak sucuk. Başka bir şey ister misiniz?', confidence: 95, action: 'continue' },
      { userMessage: 'Hayır, bu kadar.', aiReply: 'Peki, sipariş özetiniz: 2 KG Dana Parmak Sucuk. Toplam 1.780 TL. Onaylıyor musunuz?', confidence: 97, action: 'confirm' },
      { userMessage: 'Evet onaylıyorum', aiReply: 'Siparişiniz oluşturuldu. Sipariş numaranız 25-00001. Teşekkür ederiz.', confidence: 100, action: 'order_created', orderNumber: '25-00001' },
    ],
  },
  {
    id: 'sucuk-karisik',
    name: 'Karışık Sipariş',
    description: 'Müşteri birden çok ürün sipariş eder, adres ve ödeme bilgisi verir',
    steps: [
      { userMessage: '', aiReply: 'Merhaba, Ahmet İpek Sucukları\'na hoş geldiniz. Siparişinizi alabilir miyim?', confidence: 100, action: 'continue' },
      { userMessage: '3 kilo acılı parmak sucuk, 1 kilo pastırma, yarım kilo kavurma', aiReply: 'Bir saniye... Kontrol ediyorum. 3 KG Acılı Parmak Sucuk, 1 KG Pastırma, 500 GR Kavurma. Doğru mu?', confidence: 88, action: 'continue' },
      { userMessage: 'Evet doğru', aiReply: 'Teslimat adresinizi alabilir miyim?', confidence: 95, action: 'continue' },
      { userMessage: 'Ankara Etimesgut, 50. Yıl Mahallesi No:15', aiReply: 'Ankara Etimesgut adresine teslimat. Ödemeyi nasıl yapmak istersiniz? IBAN havalesi veya kredi kartı?', confidence: 90, action: 'confirm' },
      { userMessage: 'Havale yapayım', aiReply: 'IBAN bilgimizi WhatsApp üzerinden gönderiyorum. Siparişiniz oluşturuldu. Numaranız 25-00002.', confidence: 97, action: 'order_created', orderNumber: '25-00002' },
    ],
  },
  {
    id: 'insan-mudahalesi',
    name: 'İnsan Müdahalesi',
    description: 'AI çözemez, yetkiliye aktarır',
    steps: [
      { userMessage: '', aiReply: 'Merhaba, sipariş hattımıza hoş geldiniz. Sizi dinliyorum.', confidence: 100, action: 'continue' },
      { userMessage: 'Geçen hafta gönderdiğiniz siparişte sorun var', aiReply: 'Özür dilerim, bu konuda size en iyi şekilde yardımcı olabilmem için sizi yetkili arkadaşımıza aktarıyorum.', confidence: 35, action: 'human_transfer' },
    ],
  },
  {
    id: 'whatsapp-siparis',
    name: 'WhatsApp Siparişi',
    description: 'WhatsApp üzerinden kısa mesajla sipariş',
    steps: [
      { userMessage: 'Merhaba sucuk var mı', aiReply: 'Merhaba! Evet, dana parmak sucuk, acılı parmak, kangal sucuk ve pastırma çeşitlerimiz mevcut ✅ Nasıl sipariş vermek istersiniz?', confidence: 100, action: 'continue' },
      { userMessage: '2 kilo parmak sucuk alayım', aiReply: '2 KG Dana Parmak Sucuk not aldım 📦 Başka eklemek ister misiniz?', confidence: 96, action: 'continue' },
      { userMessage: 'Yarım kilo da pastırma', aiReply: '1 KG Pastırma da ekledim. Özet: 2 KG Dana Parmak Sucuk + 1 KG Pastırma = 2.680 TL. Onaylıyor musunuz?', confidence: 94, action: 'confirm' },
      { userMessage: 'Onay', aiReply: 'Siparişiniz oluşturuldu #25-00003 🎉 Ödeme için IBAN bilgimizi iletiyorum.', confidence: 100, action: 'order_created', orderNumber: '25-00003' },
    ],
  },
];
