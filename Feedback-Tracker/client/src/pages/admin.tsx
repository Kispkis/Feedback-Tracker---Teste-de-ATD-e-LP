import * as React from "react";
import { useLocation } from "wouter";
import {
  Bar,
  Doughnut,
} from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

type Satisfaction = "muito_satisfeito" | "satisfeito" | "insatisfeito";

type FeedbackRecord = {
  id: string;
  satisfaction: Satisfaction;
  iso: string;
  date: string;
  time: string;
  weekdayNumber: number;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseISOToLocalParts(iso: string) {
  const d = new Date(iso);
  return {
    date: formatDate(d),
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`,
  };
}

function weekdayNumber(d: Date) {
  const js = d.getDay();
  return js === 0 ? 7 : js;
}

const labelMap: Record<Satisfaction, string> = {
  muito_satisfeito: "Muito satisfeito",
  satisfeito: "Satisfeito",
  insatisfeito: "Insatisfeito",
};

function useAdminStore() {
  const [records, setRecords] = React.useState<FeedbackRecord[]>([]);

  React.useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent;
      if (!ce.detail) return;
      const rec = ce.detail as FeedbackRecord;
      setRecords((prev) => [rec, ...prev]);
    };

    window.addEventListener("kiosk-feedback", handler);
    return () => window.removeEventListener("kiosk-feedback", handler);
  }, []);

  return { records, setRecords };
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCSV(rows: FeedbackRecord[]) {
  const header = ["id", "satisfaction", "date", "time", "weekdayNumber", "iso"].join(","
  );
  const lines = rows.map((r) =>
    [
      r.id,
      r.satisfaction,
      r.date,
      r.time,
      String(r.weekdayNumber),
      r.iso,
    ]
      .map((v) => `"${String(v).replaceAll('"', '""')}"`)
      .join(",")
  );
  return [header, ...lines].join("\n");
}

export default function AdminPage() {
  const [, setLocation] = useLocation();

  const [authed, setAuthed] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const { records } = useAdminStore();

  const todayStr = formatDate(new Date());

  const [mode, setMode] = React.useState<"today" | "day" | "compare">("today");
  const [dayA, setDayA] = React.useState(todayStr);
  const [dayB, setDayB] = React.useState(todayStr);

  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  const sorted = React.useMemo(() => {
    return [...records].sort((a, b) => (a.iso < b.iso ? 1 : -1));
  }, [records]);

  const filtered = React.useMemo(() => {
    if (mode === "today") return sorted.filter((r) => r.date === todayStr);
    if (mode === "day") return sorted.filter((r) => r.date === dayA);
    return sorted;
  }, [sorted, mode, dayA, todayStr]);

  const visible = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  React.useEffect(() => {
    setPage(1);
  }, [mode, dayA, dayB]);

  function countsFor(rows: FeedbackRecord[]) {
    const base = {
      muito_satisfeito: 0,
      satisfeito: 0,
      insatisfeito: 0,
    } as Record<Satisfaction, number>;
    for (const r of rows) base[r.satisfaction] += 1;
    return base;
  }

  const countsAll = React.useMemo(() => countsFor(records), [records]);
  const countsFiltered = React.useMemo(() => countsFor(filtered), [filtered]);

  function percent(n: number, total: number) {
    if (!total) return 0;
    return Math.round((n / total) * 100);
  }

  const barData = React.useMemo(() => {
    const c = countsFiltered;
    return {
      labels: [labelMap.muito_satisfeito, labelMap.satisfeito, labelMap.insatisfeito],
      datasets: [
        {
          label: "Total",
          data: [c.muito_satisfeito, c.satisfeito, c.insatisfeito],
          backgroundColor: [
            "rgba(16, 185, 129, .75)",
            "rgba(56, 189, 248, .75)",
            "rgba(244, 63, 94, .75)",
          ],
          borderRadius: 10,
        },
      ],
    };
  }, [countsFiltered]);

  const doughnutData = React.useMemo(() => {
    const c = countsFiltered;
    return {
      labels: [labelMap.muito_satisfeito, labelMap.satisfeito, labelMap.insatisfeito],
      datasets: [
        {
          label: "%",
          data: [c.muito_satisfeito, c.satisfeito, c.insatisfeito],
          backgroundColor: [
            "rgba(16, 185, 129, .75)",
            "rgba(56, 189, 248, .75)",
            "rgba(244, 63, 94, .75)",
          ],
          borderColor: [
            "rgba(16, 185, 129, 1)",
            "rgba(56, 189, 248, 1)",
            "rgba(244, 63, 94, 1)",
          ],
          borderWidth: 1,
          cutout: "64%",
        },
      ],
    };
  }, [countsFiltered]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          boxWidth: 12,
          boxHeight: 12,
        },
      },
    },
    scales: {
      y: {
        ticks: {
          precision: 0,
        },
        grid: {
          color: "rgba(0,0,0,.08)",
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  } as const;

  function handleLogin() {
    setError(null);
    if (password === "1234") {
      setAuthed(true);
      setPassword("");
      return;
    }
    setError("Password incorreta");
  }

  function exportCSV() {
    const csv = toCSV(sorted);
    downloadText(`kiosk_feedback_${todayStr}.csv`, csv);
  }

  function exportTXT() {
    const lines = sorted.map((r) => {
      const parts = parseISOToLocalParts(r.iso);
      return `${r.id}\t${r.satisfaction}\t${parts.date}\t${parts.time}\t${r.weekdayNumber}`;
    });
    downloadText(`kiosk_feedback_${todayStr}.txt`, lines.join("\n"));
  }

  if (!authed) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-background to-background">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 [background:radial-gradient(1200px_700px_at_50%_-100px,rgba(56,189,248,.18),transparent_60%),radial-gradient(900px_600px_at_100%_20%,rgba(16,185,129,.14),transparent_55%),radial-gradient(900px_600px_at_0%_35%,rgba(244,63,94,.12),transparent_55%)]"
        />

        <div className="relative mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 sm:px-8 py-10">
          <Card className="border-border/70 bg-card/60 backdrop-blur p-6 sm:p-8">
            <div className="text-sm text-muted-foreground">Área reservada</div>
            <h1 data-testid="text-admin-title" className="mt-1 text-2xl font-semibold">
              Administração
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Introduza a password para aceder ao painel.
            </p>

            <div className="mt-6 grid gap-3">
              <Input
                data-testid="input-admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
              />
              <Button
                data-testid="button-admin-login"
                onClick={handleLogin}
                className="w-full"
              >
                Entrar
              </Button>
              {error && (
                <div data-testid="status-admin-error" className="text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                data-testid="button-back-kiosk"
                variant="outline"
                className="w-full"
                onClick={() => setLocation("/")}
              >
                Voltar ao kiosk
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const totalFiltered = filtered.length;

  const compareA = sorted.filter((r) => r.date === dayA);
  const compareB = sorted.filter((r) => r.date === dayB);
  const countsA = countsFor(compareA);
  const countsB = countsFor(compareB);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-background to-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 [background:radial-gradient(1200px_700px_at_50%_-100px,rgba(56,189,248,.18),transparent_60%),radial-gradient(900px_600px_at_100%_20%,rgba(16,185,129,.14),transparent_55%),radial-gradient(900px_600px_at_0%_35%,rgba(244,63,94,.12),transparent_55%)]"
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-8 py-6 sm:py-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm text-muted-foreground">/admin_2026</div>
            <h1 data-testid="text-admin-dashboard-title" className="mt-1 text-3xl font-semibold tracking-tight">
              Painel de Administração
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Nota: nesta versão mockup, os dados s\u00f3 existem nesta sess\u00e3o (ao recarregar, apaga).
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button data-testid="button-export-csv" variant="outline" onClick={exportCSV}>
              Exportar CSV
            </Button>
            <Button data-testid="button-export-txt" variant="outline" onClick={exportTXT}>
              Exportar TXT
            </Button>
            <Button data-testid="button-go-kiosk" onClick={() => setLocation("/")}>Kiosk</Button>
          </div>
        </header>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="border-border/70 bg-card/60 backdrop-blur p-5">
            <div className="text-xs text-muted-foreground">Total (tudo)</div>
            <div data-testid="text-total-all" className="mt-1 text-2xl font-semibold">
              {records.length}
            </div>
          </Card>
          <Card className="border-border/70 bg-card/60 backdrop-blur p-5">
            <div className="text-xs text-muted-foreground">Total (filtro)</div>
            <div data-testid="text-total-filtered" className="mt-1 text-2xl font-semibold">
              {totalFiltered}
            </div>
          </Card>
          <Card className="border-border/70 bg-card/60 backdrop-blur p-5">
            <div className="text-xs text-muted-foreground">Hoje</div>
            <div data-testid="text-total-today" className="mt-1 text-2xl font-semibold">
              {sorted.filter((r) => r.date === todayStr).length}
            </div>
          </Card>
        </div>

        <Card className="mt-4 border-border/70 bg-card/60 backdrop-blur p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-medium">Análise temporal</div>
              <div className="text-xs text-muted-foreground">
                Filtre por dia, veja apenas o dia atual, ou compare dois dias.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                data-testid="button-mode-today"
                variant={mode === "today" ? "default" : "outline"}
                onClick={() => setMode("today")}
              >
                Hoje
              </Button>
              <Button
                data-testid="button-mode-day"
                variant={mode === "day" ? "default" : "outline"}
                onClick={() => setMode("day")}
              >
                Filtrar por dia
              </Button>
              <Button
                data-testid="button-mode-compare"
                variant={mode === "compare" ? "default" : "outline"}
                onClick={() => setMode("compare")}
              >
                Comparar dias
              </Button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className={mode === "day" || mode === "compare" ? "" : "opacity-50 pointer-events-none"}>
              <div className="text-xs text-muted-foreground">Dia A</div>
              <Input
                data-testid="input-day-a"
                type="date"
                value={dayA}
                onChange={(e) => setDayA(e.target.value)}
              />
            </div>

            <div className={mode === "compare" ? "" : "opacity-50 pointer-events-none"}>
              <div className="text-xs text-muted-foreground">Dia B</div>
              <Input
                data-testid="input-day-b"
                type="date"
                value={dayB}
                onChange={(e) => setDayB(e.target.value)}
              />
            </div>

            <Card className="border-border/60 bg-background/40 p-4">
              <div className="text-xs text-muted-foreground">Resumo</div>
              <div className="mt-2 grid gap-1 text-sm">
                <div data-testid="text-summary-ms">Muito satisfeito: {countsFiltered.muito_satisfeito} ({percent(countsFiltered.muito_satisfeito, totalFiltered)}%)</div>
                <div data-testid="text-summary-s">Satisfeito: {countsFiltered.satisfeito} ({percent(countsFiltered.satisfeito, totalFiltered)}%)</div>
                <div data-testid="text-summary-i">Insatisfeito: {countsFiltered.insatisfeito} ({percent(countsFiltered.insatisfeito, totalFiltered)}%)</div>
              </div>
            </Card>
          </div>

          {mode === "compare" && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Card className="border-border/70 bg-background/40 p-4">
                <div className="text-sm font-medium">Dia A ({dayA})</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {countsA.muito_satisfeito} / {countsA.satisfeito} / {countsA.insatisfeito}
                </div>
              </Card>
              <Card className="border-border/70 bg-background/40 p-4">
                <div className="text-sm font-medium">Dia B ({dayB})</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {countsB.muito_satisfeito} / {countsB.satisfeito} / {countsB.insatisfeito}
                </div>
              </Card>
            </div>
          )}
        </Card>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="border-border/70 bg-card/60 backdrop-blur p-5">
            <div className="text-sm font-medium">Totais por tipo</div>
            <div className="mt-3 h-[260px]">
              <Bar data-testid="chart-bars" data={barData} options={chartOptions} />
            </div>
          </Card>

          <Card className="border-border/70 bg-card/60 backdrop-blur p-5">
            <div className="text-sm font-medium">Percentagens</div>
            <div className="mt-3 h-[260px]">
              <Doughnut data-testid="chart-doughnut" data={doughnutData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </Card>
        </div>

        <Card className="mt-4 border-border/70 bg-card/60 backdrop-blur p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Histórico</div>
              <div className="text-xs text-muted-foreground">
                Ordenado por data/hora (mais recente primeiro). Limite: {pageSize} por página.
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Button
                data-testid="button-prev-page"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <div data-testid="text-page-indicator" className="text-muted-foreground">
                {page} / {totalPages}
              </div>
              <Button
                data-testid="button-next-page"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Seguinte
              </Button>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-border/70">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Satisfação</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Dia semana</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((r) => (
                  <TableRow key={r.id} data-testid={`row-record-${r.id}`}>
                    <TableCell className="font-mono text-xs">{r.id.slice(0, 8)}…</TableCell>
                    <TableCell data-testid={`text-record-satisfaction-${r.id}`}>{labelMap[r.satisfaction]}</TableCell>
                    <TableCell data-testid={`text-record-date-${r.id}`}>{r.date}</TableCell>
                    <TableCell data-testid={`text-record-time-${r.id}`}>{r.time}</TableCell>
                    <TableCell data-testid={`text-record-weekday-${r.id}`}>{r.weekdayNumber}</TableCell>
                  </TableRow>
                ))}
                {!visible.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-sm text-muted-foreground">
                      Sem registos para mostrar.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
