import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Ticket, ScanLine, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const [{ count: events }, { count: tickets }, { count: used }] = await Promise.all([
        supabase.from("events").select("*", { count: "exact", head: true }),
        supabase.from("tickets").select("*", { count: "exact", head: true }),
        supabase.from("tickets").select("*", { count: "exact", head: true }).eq("status", "used"),
      ]);
      return { events: events ?? 0, tickets: tickets ?? 0, used: used ?? 0 };
    },
  });

  const cards = [
    { label: "Events", value: stats?.events ?? "—", icon: Calendar, color: "text-blue-500" },
    { label: "Tickets generated", value: stats?.tickets ?? "—", icon: Ticket, color: "text-emerald-500" },
    { label: "Tickets used", value: stats?.used ?? "—", icon: ScanLine, color: "text-amber-500" },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Overview of your events and tickets.</p>
        </div>
        <Link
          to="/events/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> New event
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </div>
            <div className="mt-3 text-3xl font-bold">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border bg-card p-6">
        <h2 className="font-semibold">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/events" className="rounded-md border px-4 py-2 text-sm hover:bg-accent">Manage events</Link>
          <Link to="/scan" className="rounded-md border px-4 py-2 text-sm hover:bg-accent">Open scanner</Link>
        </div>
      </div>
    </main>
  );
}
