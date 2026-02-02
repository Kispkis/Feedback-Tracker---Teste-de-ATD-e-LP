import * as React from "react";
import { useTransition, animated } from "@react-spring/web";
import { Card } from "@/components/ui/card";

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

function formatTime(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function weekdayNumber(d: Date) {
  const js = d.getDay();
  return js === 0 ? 7 : js;
}

function createRecord(satisfaction: Satisfaction): FeedbackRecord {
  const now = new Date();
  const iso = now.toISOString();
  return {
    id: (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).toString(),
    satisfaction,
    iso,
    date: formatDate(now),
    time: formatTime(now),
    weekdayNumber: weekdayNumber(now),
  };
}

const labels: Record<Satisfaction, { title: string; emoji: string; hint: string }> = {
  muito_satisfeito: {
    title: "Muito satisfeito",
    emoji: "😍",
    hint: "Excelente",
  },
  satisfeito: {
    title: "Satisfeito",
    emoji: "🙂",
    hint: "Bom",
  },
  insatisfeito: {
    title: "Insatisfeito",
    emoji: "🙁",
    hint: "Pode melhorar",
  },
};

function SatisfactionButton({
  kind,
  disabled,
  onClick,
}: {
  kind: Satisfaction;
  disabled: boolean;
  onClick: () => void;
}) {
  const meta = labels[kind];

  const accent =
    kind === "muito_satisfeito"
      ? "from-emerald-500/20 to-emerald-500/0"
      : kind === "satisfeito"
        ? "from-sky-500/20 to-sky-500/0"
        : "from-rose-500/20 to-rose-500/0";

  const ring =
    kind === "muito_satisfeito"
      ? "focus-visible:ring-emerald-500/40"
      : kind === "satisfeito"
        ? "focus-visible:ring-sky-500/40"
        : "focus-visible:ring-rose-500/40";

  return (
    <button
      type="button"
      data-testid={`button-${kind}`}
      disabled={disabled}
      onClick={onClick}
      className={
        "group relative w-full overflow-hidden rounded-3xl border border-border/70 bg-card/70 p-6 text-left shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/50 transition " +
        "focus-visible:outline-none focus-visible:ring-4 " +
        ring +
        " " +
        (disabled
          ? "opacity-70"
          : "hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm")
      }
    >
      <div
        aria-hidden
        className={
          "pointer-events-none absolute inset-0 bg-gradient-to-br " +
          accent +
          " opacity-70 group-hover:opacity-100 transition"
        }
      />
      <div className="relative flex items-center gap-5">
        <div
          data-testid={`emoji-${kind}`}
          className="grid h-20 w-20 place-items-center rounded-2xl bg-background/70 border border-border/70 shadow-sm"
        >
          <span className="text-5xl leading-none">{meta.emoji}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-4">
            <div
              data-testid={`text-title-${kind}`}
              className="text-2xl sm:text-3xl font-semibold tracking-tight"
            >
              {meta.title}
            </div>
            <div
              data-testid={`text-hint-${kind}`}
              className="hidden sm:block text-sm text-muted-foreground"
            >
              {meta.hint}
            </div>
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            Toque para registar o seu feedback
          </div>
        </div>
      </div>
    </button>
  );
}

export default function KioskPage() {
  const [records, setRecords] = React.useState<FeedbackRecord[]>([]);
  const [lockedUntil, setLockedUntil] = React.useState<number>(0);
  const [toastOpen, setToastOpen] = React.useState(false);
  const [lastKind, setLastKind] = React.useState<Satisfaction | null>(null);

  const transitions = useTransition(toastOpen, {
    from: { opacity: 0, transform: "translateY(14px) scale(0.98)" },
    enter: { opacity: 1, transform: "translateY(0px) scale(1)" },
    leave: { opacity: 0, transform: "translateY(10px) scale(0.98)" },
    config: { tension: 320, friction: 28 },
  });

  const nowMs = Date.now();
  const locked = nowMs < lockedUntil;

  function handleClick(kind: Satisfaction) {
    if (Date.now() < lockedUntil) return;

    const rec = createRecord(kind);
    setRecords((prev) => [rec, ...prev]);

    window.dispatchEvent(new CustomEvent("kiosk-feedback", { detail: rec }));

    setLastKind(kind);
    setToastOpen(true);

    setLockedUntil(Date.now() + 2000);

    window.setTimeout(() => {
      setToastOpen(false);
    }, 1200);
  }

  const today = new Date();
  const todayStr = formatDate(today);

  const total = records.length;
  const todayCount = records.filter((r) => r.date === todayStr).length;

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-background to-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 [background:radial-gradient(1200px_700px_at_50%_-100px,rgba(56,189,248,.18),transparent_60%),radial-gradient(900px_600px_at_100%_20%,rgba(16,185,129,.14),transparent_55%),radial-gradient(900px_600px_at_0%_35%,rgba(244,63,94,.12),transparent_55%)]"
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 sm:px-8 py-6 sm:py-10">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1
              data-testid="text-app-title"
              className="text-2xl sm:text-4xl font-semibold tracking-tight"
            >
              Kiosk de Satisfação
            </h1>
            <p
              data-testid="text-app-subtitle"
              className="mt-1 text-sm sm:text-base text-muted-foreground"
            >
              Escolha uma opção para registar o seu nível de satisfação
            </p>
          </div>

          <Card className="hidden sm:block shrink-0 border-border/70 bg-card/50 backdrop-blur px-4 py-3">
            <div className="text-xs text-muted-foreground">Registos</div>
            <div className="mt-0.5 flex items-baseline gap-3">
              <div data-testid="text-total-count" className="text-2xl font-semibold">
                {total}
              </div>
              <div data-testid="text-today-count" className="text-sm text-muted-foreground">
                hoje: {todayCount}
              </div>
            </div>
          </Card>
        </header>

        <main className="mt-6 sm:mt-10 flex-1">
          <div className="grid grid-cols-1 gap-4 sm:gap-5">
            <SatisfactionButton
              kind="muito_satisfeito"
              disabled={locked}
              onClick={() => handleClick("muito_satisfeito")}
            />
            <SatisfactionButton
              kind="satisfeito"
              disabled={locked}
              onClick={() => handleClick("satisfeito")}
            />
            <SatisfactionButton
              kind="insatisfeito"
              disabled={locked}
              onClick={() => handleClick("insatisfeito")}
            />
          </div>

          <div className="mt-6 sm:mt-8 text-xs sm:text-sm text-muted-foreground">
            <div data-testid="text-lock-hint" className={locked ? "" : "opacity-60"}>
              {locked ? "Aguarde 2 segundos…" : ""}
            </div>
          </div>
        </main>

        <footer className="pt-6 sm:pt-10 text-xs text-muted-foreground flex items-center justify-between gap-3">
          <div data-testid="text-footer-left">Modo kiosk (ecrã inteiro)</div>
          <div data-testid="text-footer-right">Admin: /admin_2026</div>
        </footer>
      </div>

      {transitions(
        (styles, show) =>
          show && (
            <animated.div
              style={styles}
              className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
            >
              <div
                data-testid="status-thanks"
                className="flex items-center gap-3 rounded-full border border-border/70 bg-card/80 px-5 py-3 text-sm shadow-lg backdrop-blur"
              >
                <span className="text-lg" aria-hidden>
                  {lastKind ? labels[lastKind].emoji : "✅"}
                </span>
                <span className="font-medium">Obrigado pelo seu feedback!</span>
                <span className="text-muted-foreground hidden sm:inline">
                  Registado com sucesso
                </span>
              </div>
            </animated.div>
          )
      )}
    </div>
  );
}
