'use client';

import { useEffect, useState, use } from 'react';

export default function AiAuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const tid = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    fetch(`/api/ai-audit/conversations/${tid}/${id}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => {});
  }, [id]);

  if (!data) return <div className="p-6 text-gray-400">Yukleniyor...</div>;

  const parsedJson = data.parsed_json as Record<string, unknown> | null;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <a href="/ai-audit" className="text-sm text-blue-600 hover:text-blue-800">← AI Denetim Merkezi</a>
      <h1 className="text-2xl font-bold text-gray-900">Konusma Detayi</h1>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Model', value: data.model as string, icon: '🤖' },
          { label: 'Provider', value: data.provider as string, icon: '🔌' },
          { label: 'Confidence', value: `%${data.confidence as number || 0}`, icon: '📊' },
          { label: 'Latency', value: `${data.latency_ms as number || 0}ms`, icon: '⏱' },
          { label: 'Status', value: data.success ? '✅ Basarili' : '❌ Basarisiz', icon: data.success ? '✅' : '❌' },
          { label: 'Prompt Token', value: String(data.token_prompt || 0), icon: '📝' },
          { label: 'Cikti Token', value: String(data.token_completion || 0), icon: '📄' },
          { label: 'Toplam Token', value: String((data.token_prompt as number || 0) + (data.token_completion as number || 0)), icon: '🔤' },
        ].map((c) => (
          <div key={c.label} className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500">{c.icon} {c.label}</div>
            <div className="text-sm font-bold mt-0.5">{String(c.value)}</div>
          </div>
        ))}
      </div>

      {data.error_message && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-red-700 uppercase">Hata Mesaji</p>
          <p className="text-sm text-red-600 mt-1">{data.error_message as string}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">System Prompt</p>
          <pre className="text-xs text-green-400 whitespace-pre-wrap max-h-80 overflow-y-auto">{data.system_prompt as string || 'Yok'}</pre>
        </div>
        <div className="bg-gray-900 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Kullanici Mesaji</p>
          <pre className="text-xs text-green-400 whitespace-pre-wrap max-h-80 overflow-y-auto">{data.user_message as string || 'Yok'}</pre>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase mb-2">AI Yaniti (Raw Response)</p>
        <pre className="text-xs text-green-400 whitespace-pre-wrap max-h-80 overflow-y-auto">{data.raw_response as string || 'Yok'}</pre>
      </div>

      {parsedJson && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-indigo-700 uppercase mb-2">📋 Parsed JSON</p>
          <pre className="text-xs text-indigo-900 whitespace-pre-wrap">{JSON.stringify(parsedJson, null, 2)}</pre>
        </div>
      )}

      <div className="text-xs text-gray-400">
        Konusma ID: {id} | Olusturulma: {new Date(data.created_at as string).toLocaleString('tr-TR')}
      </div>
    </div>
  );
}
