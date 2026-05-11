"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";

// Tiny inline trend chart used in the proposal-management table.
// Pre-aggregated daily counts are passed in as props from a Server Component.

export function Sparkline({
  data,
  color = "#10b981",
}: {
  data: { date: string; daily: number }[];
  color?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="text-[10px] text-muted-foreground italic">データなし</div>
    );
  }
  const total = data.reduce((s, d) => s + d.daily, 0);
  const id = `spark-grad-${color.replace("#", "")}`;
  return (
    <div className="flex items-center gap-2" aria-label={`過去14日の署名トレンド: 合計${total}筆`}>
      <div className="h-8 w-24 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.5} />
                <stop offset="100%" stopColor={color} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <Tooltip
              cursor={{ stroke: color, strokeOpacity: 0.4 }}
              formatter={(v) => [`${Number(v ?? 0)} 筆`, ""]}
              labelFormatter={(label) => `${label}`}
              contentStyle={{ fontSize: 10, padding: "2px 6px" }}
              wrapperStyle={{ outline: "none" }}
            />
            <Area
              type="monotone"
              dataKey="daily"
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#${id})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <span className="text-[10px] text-muted-foreground">14日 {total}件</span>
    </div>
  );
}
