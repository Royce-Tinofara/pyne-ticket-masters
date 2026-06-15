import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, AlertTriangle, Ticket } from "lucide-react";

export const Route = createFileRoute("/verify/$id")({
  head: () => ({ meta: [{ title: "Verify ticket" }, { name: "robots", content: "noindex" }] }),
  component: VerifyPage,
});

function VerifyPage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["verify", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("serial_number, status, used_at, events(name, event_date, venue)")
        .eq("verification_code", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/30 px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <Ticket className="h-4 w-4" />
          </div>
          <span className="font-semibold">Ticket-Masters · Verify</span>
        </div>

        {isLoading ? (
          <div className="rounded-xl border bg-card p-8 text-center">Loading…</div>
        ) : !data ? (
          <div className="rounded-xl border-2 border-amber-500 bg-amber-50 p-8 text-center">
            <AlertTriangle className="mx-auto h-14 w-14 text-amber-600" />
            <h1 className="mt-3 text-2xl font-bold text-amber-700">Ticket not found</h1>
            <p className="mt-1 text-sm text-amber-900/70">This verification code is not valid.</p>
          </div>
        ) : data.status === "valid" ? (
          <StatusCard
            tone="emerald"
            Icon={CheckCircle2}
            title="VALID"
            serial={data.serial_number}
            ev={(data as any).events}
          />
        ) : data.status === "used" ? (
          <StatusCard
            tone="red"
            Icon={XCircle}
            title="ALREADY USED"
            subtitle={data.used_at ? `Used ${new Date(data.used_at).toLocaleString()}` : undefined}
            serial={data.serial_number}
            ev={(data as any).events}
          />
        ) : (
          <StatusCard
            tone="amber"
            Icon={AlertTriangle}
            title="VOID"
            serial={data.serial_number}
            ev={(data as any).events}
          />
        )}
      </div>
    </div>
  );
}

function StatusCard({
  tone, Icon, title, subtitle, serial, ev,
}: {
  tone: "emerald" | "red" | "amber";
  Icon: any;
  title: string;
  subtitle?: string;
  serial: string;
  ev: any;
}) {
  const toneMap = {
    emerald: "border-emerald-500 bg-emerald-50 text-emerald-700",
    red: "border-red-500 bg-red-50 text-red-700",
    amber: "border-amber-500 bg-amber-50 text-amber-700",
  } as const;
  return (
    <div className={`rounded-xl border-2 p-8 text-center ${toneMap[tone]}`}>
      <Icon className="mx-auto h-16 w-16" />
      <h1 className="mt-3 text-3xl font-bold">{title}</h1>
      {subtitle && <p className="mt-1 text-sm opacity-80">{subtitle}</p>}
      <div className="mt-6 rounded-md bg-white/70 p-4 text-foreground">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Serial</div>
        <div className="font-mono text-lg font-semibold">{serial}</div>
        {ev && (
          <>
            <div className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">Event</div>
            <div className="font-semibold">{ev.name}</div>
            <div className="text-sm text-muted-foreground">
              {new Date(ev.event_date).toLocaleString()} · {ev.venue}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
