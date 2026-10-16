"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, formatNumber, formatPercent } from "@/lib/utils";

const AXIS = { stroke: "var(--chart-axis)", fontSize: 11, tickLine: false, axisLine: false } as const;

export function ChartCard({ title, description, children, table }: { title: string; description?: string; children: React.ReactNode; table?: { headers: string[]; rows: Array<Array<string | number>> } }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {children}
        {table ? (
          <table className="sr-only">
            <caption>{title}</caption>
            <thead>
              <tr>{table.headers.map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </CardContent>
    </Card>
  );
}

function TooltipBox({ title, lines }: { title: string; lines: Array<[string, string]> }) {
  return (
    <div className="rounded-[10px] border bg-popover px-3 py-2 text-xs shadow-pop">
      <div className="mb-1 font-medium text-foreground">{title}</div>
      {lines.map(([k, v]) => (
        <div key={k} className="flex items-center justify-between gap-4 text-muted-foreground">
          <span>{k}</span>
          <span className="font-medium text-foreground tabular-nums">{v}</span>
        </div>
      ))}
    </div>
  );
}

function Empty() {
  return <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">Нет данных за период</div>;
}

export function LeadsChart({ data }: { data: Array<{ label: string; leads: number }> }) {
  if (!data.some((d) => d.leads)) return <Empty />;
  return (
    <div className="h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="leadsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="label" {...AXIS} minTickGap={24} />
          <YAxis {...AXIS} allowDecimals={false} width={40} />
          <Tooltip
            cursor={{ stroke: "var(--chart-axis)", strokeDasharray: "3 3" }}
            content={(p: TooltipContentProps<ValueType, NameType>) =>
              p.active && p.payload?.length ? <TooltipBox title={String(p.label)} lines={[["Новые лиды", formatNumber(Number(p.payload[0]!.value))]]} /> : null
            }
          />
          <Area type="monotoneX" dataKey="leads" stroke="var(--chart-1)" strokeWidth={2} fill="url(#leadsFill)" activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HorizontalBars({
  data,
  format = "number",
  color = "var(--chart-1)",
  tooltip,
  height,
}: {
  data: Array<{ label: string; value: number; extra?: Array<[string, string]> }>;
  format?: "number" | "percent" | "money";
  color?: string;
  tooltip: string;
  height?: number;
}) {
  if (!data.length || !data.some((d) => d.value)) return <Empty />;
  const valueFormatter = format === "percent" ? (v: number) => formatPercent(v) : format === "money" ? formatMoney : formatNumber;
  const h = height ?? Math.max(180, data.length * 34 + 16);
  return (
    <div style={{ height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 48, left: 0, bottom: 0 }} barCategoryGap={6}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="label" {...AXIS} width={130} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
            content={(p: TooltipContentProps<ValueType, NameType>) => {
              if (!p.active || !p.payload?.length) return null;
              const row = p.payload[0]!.payload as { label: string; value: number; extra?: Array<[string, string]> };
              return <TooltipBox title={row.label} lines={[[tooltip, valueFormatter(row.value)], ...(row.extra ?? [])]} />;
            }}
          />
          <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} maxBarSize={22}>
            <LabelList dataKey="value" position="right" formatter={(v: unknown) => valueFormatter(Number(v))} fill="var(--foreground)" fontSize={11} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RevenueChart({ data }: { data: Array<{ label: string; revenue: number }> }) {
  if (!data.some((d) => d.revenue)) return <Empty />;
  return (
    <div className="h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="label" {...AXIS} />
          <YAxis {...AXIS} width={56} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}к` : String(v))} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
            content={(p: TooltipContentProps<ValueType, NameType>) =>
              p.active && p.payload?.length ? <TooltipBox title={String(p.label)} lines={[["Выручка", formatMoney(Number(p.payload[0]!.value))]]} /> : null
            }
          />
          <Bar dataKey="revenue" fill="var(--chart-3)" radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ColumnChart({ data, tooltip }: { data: Array<{ label: string; value: number }>; tooltip: string }) {
  if (!data.some((d) => d.value)) return <Empty />;
  return (
    <div className="h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="label" {...AXIS} />
          <YAxis {...AXIS} allowDecimals={false} width={40} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
            content={(p: TooltipContentProps<ValueType, NameType>) =>
              p.active && p.payload?.length ? <TooltipBox title={String(p.label)} lines={[[tooltip, formatNumber(Number(p.payload[0]!.value))]]} /> : null
            }
          />
          <Bar dataKey="value" fill="var(--chart-6)" radius={[4, 4, 0, 0]} maxBarSize={48}>
            <LabelList dataKey="value" position="top" fill="var(--foreground)" fontSize={11} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export { formatPercent };
