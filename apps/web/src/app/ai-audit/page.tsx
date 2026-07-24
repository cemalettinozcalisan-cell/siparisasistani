'use client';

import { useEffect, useState } from 'react';

export default function AiAuditPage() {
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [conversations, setConversations] = useState<Record<string, unknown>[]>([]);
  const tid = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    Promise.all([
      fetch(`/api/ai-audit/stats/${tid}`).then(r => r.json()),
      fetch(`/api/ai-audit/conversations/${tid}`).then(r => r.json()),
    ]).then(([s, c]) => {
      setStats(s);
      if (Array.isArray(c)) setConversations(c);
    }).catch(() => {});
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">AI Denetim Merkezi</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-sm text-gray-600 leading-relaxed">
          Bu sayfa, AI asistanınızın yaptığı tüm konuşmaları ve kararları denetlemenizi sağlar.
          Hangi mesajlara nasıl yanıt verdiği, ne kadar sürede yanıtladığı, güven skoru ve
          token kullanımı gibi detayları görebilirsiniz. Başarısız olan konuşmaları tespit
          edip AI'nızı iyileştirebilirsiniz.
        </p>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Toplam Konuşma', value: String(stats.total || 0), icon: '💬', color: 'from-blue-500 to-blue-600' },
          { label: 'Başarılı', value: String(stats.successful || 0), icon: '✅', color: 'from-green-500 to-green-600' },
          { label: 'Başarısız', value: String(stats.failed || 0), icon: '❌', color: 'from-red-500 to-red-600' },
          { label: 'Başarı Oranı', value: `%${stats.aiSuccessRate || 0}`, icon: '📊', color: 'from-purple-500 to-purple-600' },
          { label: 'Ort. Güven', value: `%${stats.avgConfidence || 0}`, icon: '🎯', color: 'from-amber-500 to-amber-600' },
        ].map((card) => (
          <div key={card.label} className={`rounded-xl p-4 bg-gradient-to-br ${card.color} text-white`}>
            <div className="text-lg">{card.icon}</div>
            <div className="text-xl font-bold mt-1">{String(card.value)}</div>
            <div className="text-xs opacity-90">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm">Son Konuşmalar</div>
        <div className="divide-y">
          {conversations.map((c) => (
            <a key={c.id as string} href={`/ai-audit/${c.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span>{c.success ? '✅' : '❌'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate font-medium">{c.userMessage as string || 'Mesaj yok'}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                    <span>🤖 {c.model as string}</span>
                    <span>⏱ {c.latency as number}ms</span>
                    <span>📊 %{c.confidence as number}</span>
                    <span>🔤 {c.tokens as number} token</span>
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-400 text-right ml-4">
                <p>{new Date(c.createdAt as string).toLocaleDateString('tr-TR')}</p>
                <p className="text-[10px]">{new Date(c.createdAt as string).toLocaleTimeString('tr-TR')}</p>
              </div>
            </a>
          ))}
          {conversations.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm">Henüz AI konuşması yok. AI test konsolundan bir test yapın.</div>
          )}
        </div>
      </div>
    </div>
  );
}
