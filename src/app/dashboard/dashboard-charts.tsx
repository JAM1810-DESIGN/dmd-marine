"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const compact = new Intl.NumberFormat("en-PH", {
  notation: "compact",
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 1,
});

const full = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export function RevenueTrendChart({
  data,
}: {
  data: { label: string; revenue: number; expenses: number }[];
}) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" fontSize={12} />
          <YAxis fontSize={12} tickFormatter={(value) => compact.format(Number(value))} width={70} />
          <Tooltip formatter={(value) => full.format(Number(value))} />
          <Legend />
          <Bar dataKey="revenue" name="Revenue" fill="#1e6091" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expenses" name="Expenses" fill="#c9a036" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
