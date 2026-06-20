import { type ReactNode } from "react";
import { ResponsiveContainer } from "recharts";
import { formatBRL } from "../../lib/format";

export function ChartCard({
  title,
  subtitle,
  children,
  right,
  height = 200,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  right?: ReactNode;
  height?: number;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {subtitle}
            </p>
          )}
        </div>
        {right}
      </div>
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export const axisStyle = {
  fontSize: 11,
  fill: "#94a3b8",
};

export function brlAxis(v: number): string {
  return formatBRL(v, true);
}

export const COLORS = {
  gain: "#16a34a",
  loss: "#dc2626",
  warn: "#d97706",
  neutral: "#64748b",
  base: "#3b82f6",
  grid: "#e2e8f033",
};
