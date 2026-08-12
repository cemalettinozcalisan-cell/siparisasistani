import { LucideIcon } from 'lucide-react';

export function KPICard({ icon: Icon, label, value, gradient, trend, trendUp }: {
  icon: LucideIcon;
  label: string;
  value: string;
  gradient: string;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
          <Icon size={16} className="text-white" />
        </div>
        {trend && (
          <span className={`text-[10px] font-semibold ${trendUp !== false ? 'text-emerald-600' : 'text-red-500'}`}>{trend}</span>
        )}
      </div>
      <p className="text-lg font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}
