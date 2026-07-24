"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
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

const COLORS = ["#0a2540", "#1e6091", "#c9a036", "#2f9e44", "#e8590c", "#5f3dc4", "#e03131", "#0c8599"];

export function CountBarChart({ data, color = "#0a2540" }: { data: { name: string; count: number }[]; color?: string }) {
  if (data.length === 0) {
    return <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">No data for this period.</p>;
  }
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" fontSize={12} interval={0} angle={-20} textAnchor="end" height={60} />
          <YAxis fontSize={12} allowDecimals={false} width={40} />
          <Tooltip />
          <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CountPieChart({ data }: { data: { name: string; count: number }[] }) {
  if (data.every((d) => d.count === 0)) {
    return <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">No data for this period.</p>;
  }
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function InquiriesSeriesChart({
  data,
}: {
  data: { label: string; bookings: number; contactSubmissions: number }[];
}) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" fontSize={12} />
          <YAxis fontSize={12} allowDecimals={false} width={40} />
          <Tooltip />
          <Legend />
          <Bar dataKey="bookings" name="Bookings" fill="#0a2540" radius={[4, 4, 0, 0]} />
          <Bar dataKey="contactSubmissions" name="Contact Form" fill="#c9a036" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CustomerGrowthChart({
  data,
}: {
  data: { label: string; newCustomers: number; totalCustomers: number }[];
}) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" fontSize={12} />
          <YAxis fontSize={12} allowDecimals={false} width={40} />
          <Tooltip />
          <Legend />
          <Bar dataKey="newCustomers" name="New Customers" fill="#1e6091" radius={[4, 4, 0, 0]} />
          <Line type="monotone" dataKey="totalCustomers" name="Total Customers" stroke="#c9a036" strokeWidth={2} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
