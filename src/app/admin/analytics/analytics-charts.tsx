"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ReferenceLine,
} from "recharts";

export type DailyPoint = {
  date: string;       // "MM-DD" label for the X axis
  isoDate: string;    // full YYYY-MM-DD (kept for tooltips / accessibility)
  daily: number;      // signatures captured that day
  cumulative: number; // running total through that day
};

export type MuniSlice = {
  code: string;
  label: string;
  count: number;
  isLocal: boolean;
};

const PIE_COLORS = ["#10b981", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444", "#6b7280"];

export function PetitionCharts({
  daily,
  muniSlices,
  homeCode,
  target,
}: {
  daily: DailyPoint[];
  muniSlices: MuniSlice[];
  homeCode: string;
  target: number;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <p className="mb-2 text-sm font-medium">日別 / 累積署名数（過去14日）</p>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="dayGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v, name) => [
                  Number(v ?? 0).toLocaleString(),
                  name === "cumulative" ? "累積" : "日次",
                ]}
                labelFormatter={(_, payload) => {
                  const first = payload?.[0]?.payload as { isoDate?: string } | undefined;
                  return first?.isoDate ? `日付: ${first.isoDate}` : "";
                }}
                contentStyle={{ fontSize: 12 }}
              />
              {target > 0 && (
                <ReferenceLine
                  y={target}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={{ value: `目標 ${target}`, fontSize: 10, fill: "#ef4444", position: "right" }}
                />
              )}
              <Area
                type="monotone"
                dataKey="cumulative"
                name="cumulative"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#cumGrad)"
              />
              <Area
                type="monotone"
                dataKey="daily"
                name="daily"
                stroke="#3b82f6"
                strokeWidth={1.5}
                fill="url(#dayGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          緑＝累積 / 青＝日別新規。赤破線は目標署名数。
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">
          自治体別 内訳（地元 vs 区外）
        </p>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={muniSlices}
                dataKey="count"
                nameKey="label"
                innerRadius={50}
                outerRadius={88}
                paddingAngle={2}
              >
                {muniSlices.map((slice, idx) => (
                  <Cell
                    key={slice.code}
                    fill={
                      slice.code === homeCode
                        ? "#10b981"
                        : PIE_COLORS[(idx + 1) % PIE_COLORS.length]
                    }
                    stroke="#fff"
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(v, name) => [`${Number(v ?? 0).toLocaleString()} 筆`, name]}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          地元自治体は緑で表示。地元住民の比率が高いほど、その自治体への政治的説得力が増します。
        </p>
      </div>
    </div>
  );
}
