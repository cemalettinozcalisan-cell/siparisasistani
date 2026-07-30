'use client';

import { useState } from 'react';

export default function DemoPage() {
  const [scenarios, setScenarios] = useState<Record<string, unknown>[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [sessionId] = useState(() => `demo-${Date.now()}`);
  const [conversation, setConversation] = useState<{ role: string; content: string; confidence?: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);

  if (scenarios.length === 0) {
    fetch('/api/demo/scenarios').then(r => r.json()).then(setScenarios).catch(() => {});
  }

  const startScenario = async (scenarioId: string) => {
    setLoading(true);
    setSelectedId(scenarioId);
    setConversation([]);
    const res = await fetch('/api/demo/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, scenarioId }) });
    const data = await res.json();
    setConversation([{ role: 'assistant', content: data.step.aiReply, confidence: data.step.confidence }]);
    setStarted(true);
    setLoading(false);
  };

  const sendMessage = async (msg: string) => {
    setConversation((prev) => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    const res = await fetch('/api/demo/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, message: msg }) });
    const data = await res.json();
    setConversation((prev) => [...prev, { role: 'assistant', content: data.step.aiReply, confidence: data.step.confidence }]);
    if (data.step.action === 'end') setStarted(false);
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">Demo Modu</h1>
        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">AKTIF</span>
      </div>
      <p className="text-sm text-gray-500 dark:text-slate-400 dark:text-slate-400">API anahtari olmadan sistemi test et.</p>

      {!started ? (
        <div className="grid grid-cols-2 gap-3">
          {(scenarios as { id: string; name: string; description: string }[]).map((s) => (
            <button key={s.id} onClick={() => startScenario(s.id)} disabled={loading}
              className={`p-4 rounded-xl border-2 text-left transition-all ${selectedId === s.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300'}`}>
              <div className="font-semibold text-gray-900 dark:text-white dark:text-white">{s.name}</div>
              <div className="text-sm text-gray-500 dark:text-slate-400 dark:text-slate-400 mt-1">{s.description}</div>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-3 max-h-96 overflow-y-auto">
            {conversation.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-lg px-4 py-2 rounded-xl text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900 dark:text-white dark:text-white'}`}>
                  <div className="text-xs opacity-60">{msg.role === 'user' ? 'Siz' : 'AI'}</div>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input id="demoInput" onKeyDown={(e) => { if (e.key === 'Enter') { const el = document.getElementById('demoInput') as HTMLInputElement; if (el.value.trim()) sendMessage(el.value.trim()); el.value = ''; } }} placeholder="Mesaj yaz..." className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <button onClick={() => { const el = document.getElementById('demoInput') as HTMLInputElement; if (el.value.trim()) sendMessage(el.value.trim()); el.value = ''; }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Gonder</button>
          </div>
        </div>
      )}
    </div>
  );
}
