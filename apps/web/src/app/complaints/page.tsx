'use client';

import { useEffect, useState } from 'react';

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

  const severityColors: Record<string, string> = {
    LOW: 'bg-green-100 text-green-800',
    NORMAL: 'bg-yellow-100 text-yellow-800',
    HIGH: 'bg-orange-100 text-orange-800',
    CRITICAL: 'bg-red-100 text-red-800',
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sikayetler</h1>
          <p className="text-sm text-gray-500 mt-1">Musteri sikayet ve talepleri</p>
        </div>
        <span className="text-sm text-gray-400">{complaints.length} kayit</span>
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
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${severityColors[severity] || 'bg-gray-100'}`}>
                  {severity}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>📋 {c.event_type as string}</span>
                <span>🤖 {c.actor_type as string}</span>
                <span>📡 {c.channel as string || 'SISTEM'}</span>
                <span>{new Date(c.created_at as string).toLocaleString('tr-TR')}</span>
              </div>
              {meta.ticket_number && <div className="text-xs text-blue-600">Ticket: {meta.ticket_number as string}</div>}
            </div>
          );
        })}
        {complaints.length === 0 && (
          <div className="p-8 text-center text-gray-400">
            <p className="text-3xl mb-2">✅</p>
            <p>Acil sikayet bulunmuyor</p>
          </div>
        )}
      </div>
    </div>
  );
}
