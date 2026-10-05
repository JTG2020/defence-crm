"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function WinLossChart({
  data,
}: {
  data: { month: string; won: number; lost: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
        <Tooltip
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="won" name="Won" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="lost" name="Lost" fill="var(--chart-5)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const SERIES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function OrdersByStageDonut({ data }: { data: { stage: string; count: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="stage"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell key={entry.stage} fill={SERIES[index % SERIES.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 top-[92px] text-center">
        <div className="tabular-nums text-2xl font-semibold">{total}</div>
        <div className="text-xs text-muted-foreground">open</div>
      </div>
    </div>
  );
}

export function LossReasonChart({ data }: { data: { reason: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 16, bottom: 0, left: 24 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
        <YAxis
          type="category"
          dataKey="reason"
          width={140}
          tick={{ fontSize: 12 }}
          stroke="var(--muted-foreground)"
        />
        <Tooltip
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
            fontSize: 12,
          }}
        />
        <Bar dataKey="count" name="Lost" radius={[0, 3, 3, 0]}>
          {data.map((entry, index) => (
            <Cell key={entry.reason} fill={SERIES[index % SERIES.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
