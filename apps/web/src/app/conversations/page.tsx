'use client';

import { useEffect, useState } from 'react';

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Record<string, unknown>[]>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [filter, setFilter] = useState('all');
  const tid = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    fetch(`/api/conversations/${tid}`).then(r => r.json()).then(d => {
      if (Array.isArray(d)) setConversations(d);
    }).catch(() => {});
  }, []);

  const filtered = conversations.filter((c) => {
    if (filter === 'voice' && c.channel !== 'VOICE') return false;
    if (filter === 'whatsapp' && c.channel !== 'WHATSAPP') return false;
    if (filter === 'missed' && c.status !== 'missed' && c.status !== 'failed') return false;
    return true;
  });

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    return `${Math.floor(seconds / 60)}dk ${seconds % 60}sn`;
  };

  const getStatusBadge = (c: Record<string, unknown>) => {
    const status = c.status as string;
    if (status === 'active' || status === 'AI_SPEAKING') return { label: '🟢 Devam Ediyor', color: 'bg-green-100 text-green-700' };
    if (status === 'missed' || status === 'failed' || status === 'TIMEOUT') return { label: '🔴 Kacirildi', color: 'bg-red-100 text-red-700' };
    if (status === 'completed' || status === 'COMPLETED') return { label: '✅ Tamamlandi', color: 'bg-green-100 text-green-700' };
    return { label: status, color: 'bg-gray-100 text-gray-600' };
  };

  return (
    <div className="p-4 flex gap-4 h-[calc(100vh-2rem)]">
      <div className="w-2/5 flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Konusmalar</h1>
          <span className="text-xs text-gray-400">{conversations.length} kayit</span>
        </div>
        <div className="flex gap-1">
          {[{ key: 'all', label: 'Tumu' }, { key: 'voice', label: '📞 Telefon' }, { key: 'whatsapp', label: '💬 WhatsApp' }, { key: 'missed', label: '🔴 Kacirilan' }].map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium ${filter === f.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto space-y-1.5">
          {filtered.map((c) => {
            const badge = getStatusBadge(c);
            return (
              <div key={c.id as string} onClick={() => setSelected(c)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${selected?.id === c.id ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-300' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{c.channel === 'WHATSAPP' ? '💬' : c.status === 'failed' ? '🔴' : '📞'}</span>
                    <span className="font-medium text-sm">{c.phone as string || 'Bilinmiyor'}</span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${badge.color}`}>{badge.label}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  {c.type === 'call' && <span>⏱ {formatDuration(c.duration as number | null)}</span>}
                  {c.sessionLabel && <span>🆔 {c.sessionLabel as string}</span>}
                  <span>{new Date(c.createdAt as string).toLocaleString('tr-TR')}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="w-3/5">
        {selected ? (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 h-full overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">{selected.channel === 'WHATSAPP' ? '💬 WhatsApp' : '📞 Telefon'} Gorusmesi</h2>
                <p className="text-sm text-gray-500">{selected.phone as string}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadge(selected).color}`}>{getStatusBadge(selected).label}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-lg p-3 text-sm">
              <div><span className="text-gray-500">Tarih</span><p className="font-medium">{new Date(selected.createdAt as string).toLocaleString('tr-TR')}</p></div>
              {selected.duration && <div><span className="text-gray-500">Sure</span><p className="font-medium">{formatDuration(selected.duration as number | null)}</p></div>}
              {selected.sessionLabel && <div><span className="text-gray-500">Oturum</span><p className="font-medium">{selected.sessionLabel as string}</p></div>}
            </div>
            <div className="flex gap-2">
              <a href={`tel:${selected.phone}`} target="_blank"
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100">📞 Geri Ara</a>
              <a href={`https://wa.me/${selected.phone}`} target="_blank"
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100">💬 WhatsApp Ac</a>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <p className="text-4xl mb-2">📞</p>
              <p className="text-sm">Detayi gormek icin bir konusma secin</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
