'use client';

import { getTenantId } from '@/lib/tenant';

import { useEffect, useState } from 'react';
import { ArrowLeft, Mic } from 'lucide-react';

export default function AiAuditDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const tid = getTenantId();

  useEffect(() => {
    fetch(`/api/ai-audit/conversations/${tid}/${id}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => {});
  }, [id]);

  if (!data) return <div className="p-6 text-slate-400">Yukleniyor...</div>;

  const d = data as Record<string, string | number | boolean | null>;
  const parsedJson = d.parsed_json ? JSON.parse(JSON.stringify(d.parsed_json)) : null;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto animate-fade-in">
      <a href="/ai-audit" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 transition-colors">
        <ArrowLeft className="w-4 h-4" /> AI Denetim Merkezi
      </a>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-500/20">
          <Mic size={16} strokeWidth={2.5} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Konusma Detayi</h1>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Model', value: String(d.model || ''), icon: '🤖' },
          { label: 'Provider', value: String(d.provider || ''), icon: '🔌' },
          { label: 'Confidence', value: `%${d.confidence || 0}`, icon: '📊' },
          { label: 'Latency', value: `${d.latency_ms || 0}ms`, icon: '⏱' },
          { label: 'Status', value: d.success ? '✅ Basarili' : '❌ Basarisiz', icon: d.success ? '✅' : '❌' },
          { label: 'Prompt Token', value: String(d.token_prompt || 0), icon: '📝' },
          { label: 'Output Token', value: String(d.token_completion || 0), icon: '📄' },
          { label: 'Toplam Token', value: String((Number(d.token_prompt || 0)) + (Number(d.token_completion || 0))), icon: '🔤' },
        ].map((c) => (
          <div key={c.label} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <div className="text-xs text-slate-500 dark:text-slate-400">{c.icon} {c.label}</div>
            <div className="text-sm font-bold mt-0.5 text-slate-900 dark:text-white">{String(c.value)}</div>
          </div>
        ))}
      </div>

      {(d.error_message as string) && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase">Hata Mesaji</p>
          <p className="text-sm text-red-600 dark:text-red-300 mt-1">{d.error_message as string}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase mb-2">System Prompt</p>
          <pre className="text-xs text-green-400 whitespace-pre-wrap max-h-80 overflow-y-auto">{d.system_prompt as string || 'Yok'}</pre>
        </div>
        <div className="bg-slate-900 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Kullanici Mesaji</p>
          <pre className="text-xs text-green-400 whitespace-pre-wrap max-h-80 overflow-y-auto">{d.user_message as string || 'Yok'}</pre>
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl p-4">
        <p className="text-xs font-semibold text-slate-400 uppercase mb-2">AI Yaniti (Raw Response)</p>
        <pre className="text-xs text-green-400 whitespace-pre-wrap max-h-80 overflow-y-auto">{d.raw_response as string || 'Yok'}</pre>
      </div>

      {parsedJson && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
          <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase mb-2">Parsed JSON</p>
          <pre className="text-xs text-indigo-900 dark:text-indigo-300 whitespace-pre-wrap">{JSON.stringify(parsedJson, null, 2)}</pre>
        </div>
      )}

      <div className="text-xs text-slate-400">Konusma ID: {id} | Olusturulma: {new Date(d.created_at as string || '').toLocaleString('tr-TR')}</div>
    </div>
  );
}
