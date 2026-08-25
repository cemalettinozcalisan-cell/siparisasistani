'use client';

import { useEffect, useState, Suspense } from 'react';
import { LifeBuoy, Plus, X, Send, Sparkles, Clock, User, ChevronRight, Bot } from 'lucide-react';
import { getTenantId } from '@/lib/tenant';

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  category: string;
  description: string | null;
  status: string;
  priority: string;
  ai_diagnosis: string | null;
  ai_diagnosed: boolean;
  created_at: string;
}

interface Message {
  id: string;
  sender: string;
  body: string;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  telefon: 'Telefon', whatsapp: 'WhatsApp', instagram: 'Instagram', sms: 'SMS',
  ai: 'Yapay Zeka', siparis: 'Sipariş', odeme: 'Ödeme', kurulum: 'Kurulum',
  fatura: 'Fatura', diger: 'Diğer', other: 'Diğer',
};

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  open: { label: 'Açık', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  investigating: { label: 'İnceleniyor', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  resolved: { label: 'Çözüldü', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  closed: { label: 'Kapalı', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
};

const PRIORITY_CONFIG: Record<string, { label: string; cls: string }> = {
  low: { label: 'Düşük', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  medium: { label: 'Orta', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  high: { label: 'Yüksek', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  urgent: { label: 'Acil', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

export default function SupportPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-400">Yükleniyor...</div>}>
      <SupportContent />
    </Suspense>
  );
}

function SupportContent() {
  const tid = getTenantId();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [diagnosing, setDiagnosing] = useState(false);
  const [form, setForm] = useState({ subject: '', category: 'whatsapp', description: '', priority: 'medium' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch(`/api/support/${tid}${statusFilter ? `?status=${statusFilter}` : ''}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setTickets(d); })
      .catch(() => {});
  };

  useEffect(load, [tid, statusFilter]);

  const openDetail = (t: Ticket) => {
    setSelected(t);
    fetch(`/api/support/${tid}/${t.id}`).then(r => r.json()).then(d => {
      setMessages(Array.isArray(d.messages) ? d.messages : []);
    }).catch(() => setMessages([]));
  };

  const createTicket = async () => {
    if (!form.subject.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/support/${tid}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const created = await res.json();
      if (created.id) {
        setShowNew(false);
        setForm({ subject: '', category: 'whatsapp', description: '', priority: 'medium' });
        load();
      }
    } catch {}
    setSaving(false);
  };

  const sendMessage = async () => {
    if (!selected || !newMsg.trim()) return;
    await fetch(`/api/support/${tid}/${selected.id}/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: 'staff', message: newMsg }),
    });
    setNewMsg('');
    openDetail(selected);
  };

  const runDiagnosis = async () => {
    if (!selected) return;
    setDiagnosing(true);
    await fetch(`/api/support/${tid}/${selected.id}/diagnose`, { method: 'POST' });
    setDiagnosing(false);
    openDetail(selected);
    load();
  };

  const updateStatus = async (status: string) => {
    if (!selected) return;
    await fetch(`/api/support/${tid}/${selected.id}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    });
    openDetail(selected);
    load();
  };

  return (
    <div className="p-4 md:p-6 space-y-5 w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-sm shadow-emerald-500/20">
              <LifeBuoy size={16} strokeWidth={2.5} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Destek</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Esnaf teknik desteği — AI ön tanı ile</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg text-xs font-semibold shadow-md transition-all">
          <Plus size={14} /> Destek Talebi Aç
        </button>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: '', label: 'Tümü' },
          { key: 'open', label: 'Açık' },
          { key: 'investigating', label: 'İnceleniyor' },
          { key: 'resolved', label: 'Çözüldü' },
          { key: 'closed', label: 'Kapalı' },
        ].map((f) => (
          <button key={f.key} onClick={() => setStatusFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${statusFilter === f.key ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Ticket List */}
      <div className="space-y-2">
        {tickets.map((t) => {
          const sc = STATUS_CONFIG[t.status] || STATUS_CONFIG.open;
          const pc = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium;
          return (
            <div key={t.id} onClick={() => openDetail(t)}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 cursor-pointer hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800 transition-all">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-sm">
                    <LifeBuoy size={16} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{t.subject}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{t.ticket_number}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{CATEGORY_LABELS[t.category] || t.category}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pc.cls}`}>{pc.label}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.cls}`}>{sc.label}</span>
                  {t.ai_diagnosed && <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"><Sparkles size={10} /> AI</span>}
                  <ChevronRight size={15} className="text-slate-300" />
                </div>
              </div>
            </div>
          );
        })}
        {tickets.length === 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-10 text-center">
            <LifeBuoy size={28} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Destek talebi bulunmuyor</p>
          </div>
        )}
      </div>

      {/* New Ticket Modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowNew(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Yeni Destek Talebi</h3>
              <button onClick={() => setShowNew(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">✕</button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Konu *</label>
              <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Örn: WhatsApp çalışmıyor"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Kategori</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none">
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Öncelik</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none">
                  <option value="low">Düşük</option><option value="medium">Orta</option>
                  <option value="high">Yüksek</option><option value="urgent">Acil</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Açıklama</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none resize-none" />
            </div>
            <button onClick={createTicket} disabled={saving}
              className="w-full px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium shadow-md disabled:opacity-50">
              {saving ? 'Oluşturuluyor...' : 'Talebi Oluştur'}
            </button>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{selected.subject}</h3>
                  <span className="text-[10px] font-mono text-slate-400">{selected.ticket_number}</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_CONFIG[selected.status].cls}`}>{STATUS_CONFIG[selected.status].label}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{CATEGORY_LABELS[selected.category] || selected.category}</span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1"><Clock size={11} /> {new Date(selected.created_at).toLocaleString('tr-TR')}</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">✕</button>
            </div>

            {/* AI Diagnosis */}
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-violet-50/50 dark:bg-violet-900/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1.5"><Sparkles size={13} /> AI Ön Tanı</span>
                <button onClick={runDiagnosis} disabled={diagnosing}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-violet-500 hover:bg-violet-600 text-white shadow-sm disabled:opacity-50">
                  <Bot size={12} /> {diagnosing ? 'Tanılanıyor...' : selected.ai_diagnosed ? 'Yeniden Tanı' : 'Tanı Çalıştır'}
                </button>
              </div>
              {selected.ai_diagnosis ? (
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">{selected.ai_diagnosis}</p>
              ) : (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">Henüz AI tanısı yok. "Tanı Çalıştır" ile kanal sağlığı otomatik kontrol edilir.</p>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {selected.description && (
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-xs text-slate-700 dark:text-slate-300">
                  <span className="block text-[10px] text-slate-400 mb-1 flex items-center gap-1"><User size={10} /> Açıklama</span>
                  {selected.description}
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === 'staff' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${m.sender === 'staff' ? 'bg-emerald-500 text-white' : m.sender === 'ai' ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                    {m.body}
                    <span className={`block text-[9px] mt-1 ${m.sender === 'staff' ? 'text-white/70' : 'text-slate-400'}`}>
                      {new Date(m.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer: status + reply */}
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 space-y-2">
              <div className="flex items-center gap-2">
                {['open', 'investigating', 'resolved', 'closed'].map((s) => (
                  <button key={s} onClick={() => updateStatus(s)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${selected.status === s ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                    {STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input value={newMsg} onChange={(e) => setNewMsg(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
                  placeholder="Yanıt yazın..." className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                <button onClick={sendMessage} className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow-sm"><Send size={16} /></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
