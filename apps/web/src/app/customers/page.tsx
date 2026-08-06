'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { CustomerDetail } from '@/components/customer-detail';
import { Upload, FileSpreadsheet, Download, X } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Record<string, unknown>[]>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [timeline, setTimeline] = useState<Record<string, unknown>[]>([]);
  const [orders, setOrders] = useState<Record<string, unknown>[]>([]);
  const [complaints, setComplaints] = useState<Record<string, unknown>[]>([]);
  const [search, setSearch] = useState('');
  const [allTimeline, setAllTimeline] = useState<Record<string, unknown>[]>([]);
  const tid = '00000000-0000-0000-0000-000000000001';

  // Bulk import states
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<Array<Record<string, string>>>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importMapping, setImportMapping] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const IMPORT_FIELDS: Record<string, string> = { name: 'Ad Soyad', phone: 'Telefon', city: 'Şehir', address: 'Adres', company_name: 'Şirket', birth_date: 'Doğum Tarihi', identity_number: 'TC / Vergi No' };
  const [nameKey, phoneKey, cityKey, addressKey, companyKey, birthdateKey, identityKey] = Object.keys(IMPORT_FIELDS);

  const load = useCallback(async () => {
    Promise.all([
      fetch(`/api/customers/${tid}`).then(r => r.json()),
      fetch(`/api/timeline/recent/${tid}?limit=200`).then(r => r.json()),
    ]).then(([cust, tl]) => {
      setCustomers(Array.isArray(cust) ? cust : []);
      setAllTimeline(Array.isArray(tl) ? tl : []);
    }).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'binary' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
        const headers = Object.keys(data[0] || {});
        setImportPreview(data.slice(0, 5));
        setImportHeaders(headers);
        const autoMap: Record<string, string> = {};
        for (const h of headers) {
          const hl = h.toLowerCase();
          if (hl.includes('ad') && hl.includes('soy')) autoMap[nameKey] = h;
          else if (hl.includes('telefon') || hl.includes('phone') || hl.includes('tel')) autoMap[phoneKey] = h;
          else if (hl.includes('şehir') || hl.includes('city') || hl.includes('il')) autoMap[cityKey] = h;
          else if (hl.includes('adres') || hl.includes('address')) autoMap[addressKey] = h;
          else if (hl.includes('şirket') || hl.includes('company') || hl.includes('firma')) autoMap[companyKey] = h;
          else if (hl.includes('doğum') || hl.includes('birth') || hl.includes('dogum')) autoMap[birthdateKey] = h;
          else if (hl.includes('tc') || hl.includes('vergi') || hl.includes('kimlik') || hl.includes('identity')) autoMap[identityKey] = h;
        }
        setImportMapping(autoMap);
      } catch { setImportPreview([]); setImportHeaders([]); }
    };
    reader.readAsBinaryString(file);
  };

  const doImport = async () => {
    setImporting(true);
    setImportResult(null);
    try {
      const file = importFile!;
      const data = await new Promise<Array<Record<string, string>>>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const wb = XLSX.read(ev.target?.result, { type: 'binary' });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          resolve(XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' }));
        };
        reader.readAsBinaryString(file);
      });
      const mapped = data.map((row) => {
        const result: Record<string, string> = {};
        for (const [field, header] of Object.entries(importMapping)) {
          if (header && row[header] !== undefined) result[field] = String(row[header]);
        }
        return result;
      }).filter((r) => r.name || r.phone);

      const res = await fetch(`/api/customers/bulk-import/${tid}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: mapped, skipDuplicates: true }),
      });
      const json = await res.json();
      setImportResult(json);
      if (json.imported > 0) load();
    } catch { setImportResult({ imported: 0, skipped: 0, errors: ['Sunucu hatası'] }); }
    setImporting(false);
  };

  const resetImport = () => { setShowImport(false); setImportFile(null); setImportPreview([]); setImportHeaders([]); setImportMapping({}); setImportResult(null); };

  // Deduplicate by phone: group customers with same phone, merge data
  const deduped = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    for (const c of customers) {
      const phone = (c.phone as string) || '';
      if (!phone) { map.set(c.id as string, c); continue; }
      if (map.has(phone)) {
        const existing = map.get(phone)!;
        const existingOrders = Number((existing as any).order_count || 0);
        const newOrders = Number((c as any).order_count || 0);
        map.set(phone, {
          ...existing,
          order_count: existingOrders + newOrders,
          _merged: true,
          _merge_count: ((existing as any)._merge_count || 1) + 1,
          _cities: [...new Set([existing.city, c.city].filter(Boolean))].join(', '),
        });
      } else {
        map.set(phone, { ...c, _merged: false, _merge_count: 1, _cities: c.city as string || '' });
      }
    }
    return Array.from(map.values());
  }, [customers]);

  const selectCustomer = async (c: Record<string, unknown>) => {
    setSelected(c);
    const phone = c.phone as string || '';

    const [tlRes, ordRes] = await Promise.all([
      fetch(`/api/timeline/customer/${tid}/${c.id}`),
      fetch(`/api/orders-list/${tid}?limit=50`),
    ]);

    let tl = await tlRes.json();
    if (!Array.isArray(tl) || tl.length === 0) {
      // Mock timeline data for demo customers
      const now = Date.now();
      tl = [
        { id: 'tl-1', event_type: 'ORDER_CREATED', description: 'AI, telefon üzerinden sipariş oluşturdu', actor_type: 'AI', channel: 'VOICE', created_at: new Date(now - 86400000 * 30).toISOString() },
        { id: 'tl-2', event_type: 'PAYMENT_CONFIRMED', description: 'Ödeme onaylandı (IBAN)', actor_type: 'SYSTEM', channel: 'SYSTEM', created_at: new Date(now - 86400000 * 30 + 3600000).toISOString() },
        { id: 'tl-3', event_type: 'PACKAGING', description: 'Sipariş paketlenmeye başlandı', actor_type: 'STAFF', channel: 'SYSTEM', created_at: new Date(now - 86400000 * 28).toISOString() },
        { id: 'tl-4', event_type: 'SHIPPED', description: 'Sipariş kargoya verildi (MNG Kargo)', actor_type: 'STAFF', channel: 'SYSTEM', created_at: new Date(now - 86400000 * 27).toISOString() },
        { id: 'tl-5', event_type: 'DELIVERED', description: 'Teslim edildi', actor_type: 'SYSTEM', channel: 'SYSTEM', created_at: new Date(now - 86400000 * 25).toISOString() },
      ];
    }
    setTimeline(tl);

    const ordData = await ordRes.json();
    const allOrders = Array.isArray(ordData) ? ordData : [];
    const customerOrders = allOrders.filter((o: Record<string, unknown>) =>
      o.customer_phone === phone || o.customer_name === c.name
    );
    setOrders(customerOrders);

    const comps = allTimeline.filter((e) =>
      ((e.event_type as string)?.includes('COMPLAINT') || e.event_type === 'HUMAN_REQUIRED') &&
      (e.description as string)?.includes((c.name as string) || '')
    );
    setComplaints(comps);
  };

  const filtered = deduped.filter((c) => {
    const q = search.toLowerCase();
    return (c.name as string || '').toLowerCase().includes(q) || (c.phone as string || '').includes(q);
  });

  return (
    <div className="p-4 flex gap-4 h-[calc(100vh-2rem)]">
      <div className="w-1/3 flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Müşteriler</h1>
          <div className="flex items-center gap-2">
            <input placeholder="İsim/telefon ara..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-40" />
            <button onClick={() => setShowImport(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-700">
              <FileSpreadsheet size={15} /> Excel'den Yükle
            </button>
          </div>
        </div>
        <div className="text-xs text-gray-400">{filtered.length} müşteri</div>
        <div className="flex-1 overflow-y-auto space-y-1">
          {filtered.map((c) => {
            const src = (c as any).last_source || '';
            const chColors: Record<string, string> = {
              PHONE: 'bg-blue-100 text-blue-700', WHATSAPP: 'bg-emerald-100 text-emerald-700',
              SMS: 'bg-sky-100 text-sky-700', INSTAGRAM: 'bg-pink-100 text-pink-700',
              WEBSITE: 'bg-indigo-100 text-indigo-700',
            };
            const chLabels: Record<string, string> = {
              PHONE: '📱', WHATSAPP: '💬', SMS: '📲', INSTAGRAM: '📸', WEBSITE: '🌐',
            };
            const phone = String(c.phone || '');
            const formatted = phone.length >= 10 ? `${phone.slice(0,4)} ${phone.slice(4,7)} ${phone.slice(7,9)} ${phone.slice(9)}` : phone;
            return (
            <div key={c.id as string} onClick={() => selectCustomer(c)}
              className={`p-3 rounded-lg cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md group ${selected?.id === c.id ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 ring-1 ring-indigo-300' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-sm truncate">{c.name as string || 'İsimsiz'}</span>
                  {src && chColors[src] && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${chColors[src]}`}>
                      {chLabels[src]} {src === 'SMS' ? 'SMS' : src === 'WHATSAPP' ? 'WA' : src === 'INSTAGRAM' ? 'IG' : src}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-gray-400 shrink-0 font-mono">{formatted}</span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <span>📦 {Number((c as any).order_count || 0)} sipariş</span>
                {Number((c as any).balance || 0) > 0 && <span className="text-red-500 font-medium">💰 {Number((c as any).balance).toLocaleString('tr-TR')} TL</span>}
                {(c as any).city && <span className="truncate">📍 {(c as any).city}</span>}
              </div>
            </div>
          );
        })}
        </div>
      </div>

      <div className="w-2/3 overflow-y-auto">
        {selected ? (
          <CustomerDetail customer={selected} orders={orders} timeline={timeline} complaints={complaints} onRefresh={() => selectCustomer(selected)} />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/20 dark:to-violet-900/20 flex items-center justify-center">
                <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-base font-medium text-gray-500 dark:text-slate-400">Müşteri Seçilmedi</p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Detayları görüntülemek için soldan bir müşteri seçin</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { if (!importing) resetImport(); }}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Excel'den Müşteri Yükle</h3>
              </div>
              <button onClick={resetImport} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><X size={18} /></button>
            </div>

            <div className="p-5 space-y-4">
              {!importResult && (
                <>
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl p-8 text-center">
                    <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" id="import-cust-file" />
                    <label htmlFor="import-cust-file" className="cursor-pointer flex flex-col items-center gap-2">
                      <Upload size={28} className="text-slate-400" />
                      <span className="text-sm text-gray-600 dark:text-slate-300">
                        {importFile ? importFile.name : 'Excel veya CSV dosyası sürükleyin ya da seçin'}
                      </span>
                      {!importFile && <span className="text-xs text-slate-400">.xlsx, .xls, .csv</span>}
                    </label>
                  </div>

                  {importHeaders.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Sütun Eşleştirme</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(IMPORT_FIELDS).map(([field, label]) => (
                          <div key={field} className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-24 flex-shrink-0">{label}</span>
                            <select
                              value={importMapping[field] || ''}
                              onChange={(e) => setImportMapping({ ...importMapping, [field]: e.target.value })}
                              className="flex-1 px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white">
                              <option value="">-- Seçin --</option>
                              {importHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {importPreview.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Önizleme (ilk {Math.min(importPreview.length, 5)} satır)</h4>
                      <div className="overflow-auto">
                        <table className="w-full text-xs border border-slate-200 dark:border-slate-700">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-700">
                              {importHeaders.map((h) => <th key={h} className="px-2 py-1.5 text-left text-slate-600 dark:text-slate-300 border-b">{h}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {importPreview.slice(0, 5).map((row, i) => (
                              <tr key={i} className="border-b border-slate-100 dark:border-slate-700">
                                {importHeaders.map((h) => <td key={h} className="px-2 py-1 text-slate-700 dark:text-slate-300">{String(row[h] || '')}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}

              {importResult && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <Download size={20} />
                    <span className="font-semibold">İçe aktarma tamamlandı</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-emerald-600">{importResult.imported}</div>
                      <div className="text-xs text-emerald-500">içe aktarıldı</div>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-700 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-slate-500">{importResult.skipped}</div>
                      <div className="text-xs text-slate-400">atlandı</div>
                    </div>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <p className="text-xs text-red-600 mb-1 font-medium">Hatalar:</p>
                      {importResult.errors.map((e, i) => <p key={i} className="text-xs text-red-500">{e}</p>)}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
              <button onClick={resetImport} disabled={importing} className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">İptal</button>
              {!importResult && importFile && importMapping.name && importMapping.phone && (
                <button onClick={doImport} disabled={importing}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50">
                  {importing ? 'Yükleniyor...' : 'Yüklemeyi Başlat'}
                </button>
              )}
              {importResult && (
                <button onClick={resetImport} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">Kapat</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
