"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

import { useCurrency } from "@/components/shared/currency-provider";

const COLORS = ["#0a2540", "#1e6091", "#c9a036", "#2f9e44", "#e8590c", "#5f3dc4", "#e03131", "#0c8599"];

export function MonthlyBarChart({
  data,
  dataKey,
  label,
  color,
}: {
  data: { label: string; revenue: number; expenses: number }[];
  dataKey: "revenue" | "expenses";
  label: string;
  color: string;
}) {
  const { format } = useCurrency();
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" fontSize={12} />
          <YAxis fontSize={12} tickFormatter={format} width={70} />
          <Tooltip formatter={(value) => format(Number(value))} />
          <Bar dataKey={dataKey} name={label} fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RevenueVsExpensesChart({ data }: { data: { label: string; revenue: number; expenses: number }[] }) {
  const { format } = useCurrency();
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" fontSize={12} />
          <YAxis fontSize={12} tickFormatter={format} width={70} />
          <Tooltip formatter={(value) => format(Number(value))} />
          <Legend />
          <Bar dataKey="revenue" name="Revenue" fill="#0a2540" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expenses" name="Expenses" fill="#c9a036" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function YearlyTrendChart({ data }: { data: { label: string; revenue: number; expenses: number }[] }) {
  const { format } = useCurrency();
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" fontSize={12} />
          <YAxis fontSize={12} tickFormatter={format} width={70} />
          <Tooltip formatter={(value) => format(Number(value))} />
          <Legend />
          <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#0a2540" strokeWidth={2} />
          <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#c9a036" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BreakdownPieChart({ data }: { data: { name: string; amount: number }[] }) {
  const { format } = useCurrency();

  if (data.length === 0) {
    return <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">No data yet.</p>;
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="amount" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => format(Number(value))} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
