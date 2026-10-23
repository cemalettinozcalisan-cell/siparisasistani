/**
 * F0 testi: Sipariş AI granular araçlarını çağırır ve gerçek sipariş oluşumunu doğrular.
 * Kullanım: node apps/api/scripts/order-ai-test.mjs
 */
const BASE = process.env.API_BASE || 'http://localhost:3001';
const TENANT = process.env.DEMO_TENANT_ID || '00000000-0000-0000-0000-000000000001';
const SESSION = 'f0-test-' + Date.now();

async function tool(tool, args = {}) {
  const r = await fetch(`${BASE}/api/order-ai/dev/tool`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId: TENANT, sessionId: SESSION, tool, args }),
  });
  return r.json();
}

(async () => {
  console.log('== F0: Sipariş AI araç zinciri ==');
  await tool('reset');
  console.log('set_customer :', await tool('set_customer', { name: 'Test Müşteri', phone: '05559998877' }));
  console.log('add_item     :', await tool('add_item', { product_name: 'Kangal Sucuk', quantity: 5, unit: 'kg' }));
  console.log('add_item     :', await tool('add_item', { product_name: 'Pastırma', quantity: 2, unit: 'kilogram' }));
  console.log('set_address  :', await tool('set_address', { address: 'Atatürk Cd. No:1', city: 'Ankara' }));
  console.log('set_payment  :', await tool('set_payment', { payment: 'havale' }));
  const confirm = await tool('confirm_order');
  console.log('confirm_order:', JSON.stringify(confirm));

  console.log('\n== Negatif test (ürün yok) ==');
  await tool('reset');
  await tool('set_customer', { name: 'Eksik Müşteri', phone: '05551110000' });
  const bad = await tool('confirm_order');
  console.log('boş sipariş  :', JSON.stringify(bad), '(ok:false beklenir)');

  console.log('\n== Negatif test (geçersiz ödeme) ==');
  await tool('reset');
  await tool('set_customer', { name: 'X', phone: '05551112222' });
  await tool('add_item', { product_name: 'Kavurma', quantity: 1, unit: 'kg' });
  console.log('set_payment  :', await tool('set_payment', { payment: 'kripto' }), '(ok:false beklenir)');

  console.log('\nBitti. confirm_order başarılıysa sipariş oluştu (orders/order_items).');
})();
