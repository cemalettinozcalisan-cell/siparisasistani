'use client';

import { useEffect, useState } from 'react';

const SEVERITY_TR: Record<string, string> = {
  LOW: 'DÜŞÜK', NORMAL: 'NORMAL', HIGH: 'YÜKSEK', CRITICAL: 'KRİTİK',
};

const SEVERITY_COLORS: Record<string, string> = {
  LOW: 'bg-green-100 text-green-800', NORMAL: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800', CRITICAL: 'bg-red-100 text-red-800',
};

const EVENT_TYPE_TR: Record<string, string> = {
  COMPLAINT_OPEN: 'ŞİKAYET AÇILDI', COMPLAINT_RESOLVED: 'ÇÖZÜLDÜ',
  COMPLAINT_REOPENED: 'YENİDEN AÇILDI', HUMAN_REQUIRED: 'İNSAN MÜDAHALESİ',
};

const ACTOR_TR: Record<string, string> = { AI: 'YZ', HUMAN: 'İNSAN', SYSTEM: 'SİSTEM' };

const CHANNEL_TR: Record<string, string> = {
  VOICE: 'SES', WHATSAPP: 'WHATSAPP', PHONE: 'TELEFON', SISTEM: 'SİSTEM',
};

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Record<string, unknown>[]>([]);
  const tid = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    fetch(`/api/timeline/recent/${tid}?limit=100`)
      .then(r => r.json())
      .then(data => {
        const filtered = (Array.isArray(data) ? data : []).filter((e: Record<string, unknown>) =>
          (e.event_type as string)?.startsWith('COMPLAINT') || (e.event_type as string) === 'HUMAN_REQUIRED'
        );
        setComplaints(filtered);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Şikayet & İstek</h1>
          <p className="text-sm text-gray-500 mt-1">Müşteri şikayet ve talepleri</p>
        </div>
        <span className="text-sm text-gray-400">{complaints.length} kayıt</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y">
        {complaints.map((c, i) => {
          const meta = c.metadata as Record<string, unknown> || {};
          const severity = (meta.severity as string) || 'NORMAL';
          return (
            <div key={i} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{c.event_icon as string || '⚠️'}</span>
                  <span className="font-medium text-sm">{c.description as string}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_COLORS[severity] || 'bg-gray-100'}`}>
                  {SEVERITY_TR[severity] || severity}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>📋 {EVENT_TYPE_TR[c.event_type as string] || c.event_type as string}</span>
                <span>🤖 {ACTOR_TR[c.actor_type as string] || c.actor_type as string}</span>
                <span>📡 {CHANNEL_TR[c.channel as string] || c.channel as string || 'SİSTEM'}</span>
                <span>{new Date(c.created_at as string).toLocaleString('tr-TR')}</span>
              </div>
              {Boolean(meta.ticket_number) && <div className="text-xs text-blue-600">Talep No: {String(meta.ticket_number)}</div>}
            </div>
          );
        })}
        {complaints.length === 0 && (
          <div className="p-8 text-center text-gray-400">
            <p className="text-3xl mb-2">✅</p>
            <p>Şikayet veya istek bulunmuyor</p>
          </div>
        )}
      </div>
    </div>
  );
}
