'use client';

import { usePathname } from 'next/navigation';
import { Layout } from '@/components/layout';
import { AiEmployeeVoice } from '@/components/ai-employee-voice';
import { AiEmployeeChat } from '@/components/ai-employee-chat';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const noLayout = pathname === '/' || pathname === '/login';

  if (noLayout) return <>{children}</>;
  return <Layout>{children}<AiEmployeeVoice /><AiEmployeeChat /></Layout>;
}
