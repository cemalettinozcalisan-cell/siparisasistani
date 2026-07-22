export interface NotificationTemplate {
  whatsapp: string;
  panel: string;
}

export const TEMPLATES: Record<string, NotificationTemplate> = {
  ORDER_CREATED: {
    whatsapp: `🆕 *Yeni Sipariş*\n📋 Sipariş No: #{orderNumber}\n👤 Müşteri: {customerName}\n📞 Telefon: {customerPhone}\n📦 Ürünler:\n{productList}\n📍 Teslimat: {address}\n💰 Tutar: {totalPrice} TL\n💳 Ödeme: {payment}\n🕐 {time}`,
    panel: 'Yeni sipariş #{orderNumber} - {customerName} - {totalPrice} TL',
  },
  PAYMENT_CREATED: {
    whatsapp: `💳 *Ödeme Bilgileri*\n📋 Sipariş No: #{orderNumber}\n💰 Tutar: {totalPrice} TL\n🏦 IBAN: {iban}\n📝 Açıklama: #{orderNumber}\n\nHavale yapıldıktan sonra siparişiniz hazırlanmaya başlayacaktır.`,
    panel: '💳 Ödeme oluşturuldu - #{orderNumber}',
  },
  PAYMENT_RECEIVED: {
    whatsapp: `✅ *Ödeme Onaylandı*\n📋 Sipariş No: #{orderNumber}\n💰 Tutar: {totalPrice} TL\n\nSiparişiniz hazırlanmaya başlamıştır. 🎉`,
    panel: '✅ Ödeme alındı - #{orderNumber} - {totalPrice} TL',
  },
  PAYMENT_FAILED: {
    whatsapp: `❌ *Ödeme Başarısız*\n📋 Sipariş No: #{orderNumber}\n💰 Tutar: {totalPrice} TL\n\nÖdemeniz gerçekleşmedi. Lütfen tekrar deneyiniz.`,
    panel: '❌ Ödeme başarısız - #{orderNumber}',
  },
  PAYMENT_EXPIRED: {
    whatsapp: `⏰ *Ödeme Süresi Doldu*\n📋 Sipariş No: #{orderNumber}\n💰 Tutar: {totalPrice} TL\n\nÖdeme süresi dolmuştur. Tekrar sipariş vermek için bizi arayabilirsiniz.`,
    panel: '⏰ Ödeme süresi doldu - #{orderNumber}',
  },
  PAYMENT_REMINDER_SENT: {
    whatsapp: `🔔 *Ödeme Hatırlatması*\n📋 Sipariş No: #{orderNumber}\n💰 Tutar: {totalPrice} TL\n\nÖdemenizi henüz alamadık. Havale yapmanız durumunda siparişiniz hazırlanmaya başlayacaktır.`,
    panel: '🔔 Ödeme hatırlatıldı - #{orderNumber}',
  },
  SHIPMENT_CREATED: {
    whatsapp: `📦 *Siparişiniz Hazırlandı*\n📋 Sipariş No: #{orderNumber}\n\nPaketlemeye hazırlanıyor. En kısa sürede kargoya verilecektir. 🎉`,
    panel: '📦 Paketleniyor - #{orderNumber}',
  },
  SHIPMENT_SHIPPED: {
    whatsapp: `🚚 *Kargoya Verildi*\n📋 Sipariş No: #{orderNumber}\n🚚 Kargo: {cargoCompany}\n🔗 Takip: {trackingUrl}\n📦 Takip No: {trackingNo}\n\nSiparişiniz en kısa sürede teslim edilecektir.`,
    panel: '🚚 Kargoya verildi - #{orderNumber} - {cargoCompany}',
  },
  SHIPMENT_DELIVERED: {
    whatsapp: `✅ *Teslim Edildi*\n📋 Sipariş No: #{orderNumber}\n\nAfiyet olsun! 🎉\nBizi tercih ettiğiniz için teşekkür ederiz.`,
    panel: '✅ Teslim edildi - #{orderNumber}',
  },
  COMPLAINT_OPEN: {
    whatsapp: `⚠️ *Şikayet Kaydı*\n👤 Müşteri: {customerName}\n📞 Telefon: {customerPhone}\n📋 Şikayet No: {ticketId}\n🔴 Seviye: {severity}\n📝 Açıklama: {description}\n\nYetkili arkadaşımız en kısa sürede dönüş yapacaktır.`,
    panel: '⚠️ {severity} şikayet - {customerName}',
  },
  HUMAN_TRANSFER: {
    whatsapp: `👤 *Yetkili Talebi*\n👤 Müşteri: {customerName}\n📞 Telefon: {customerPhone}\n📝 Konu: {description}\n\nMüşteri yetkili talep etmiştir.`,
    panel: '👤 Yetkili talebi - {customerName}',
  },
};
