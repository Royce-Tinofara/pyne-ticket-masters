import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin, Plus, Ticket } from "lucide-react";

export const Route = createFileRoute("/_authenticated/events/")({
  component: EventsList,
});

function EventsList() {
  const { data: events, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, name, event_date, venue, ticket_design_url")
        .order("event_date", { ascending: false });
      if (error) throw error;
      // ticket counts
      const ids = (data ?? []).map((e: any) => e.id);
      if (!ids.length) return [];
      const { data: counts } = await supabase
        .from("tickets")
        .select("event_id")
        .in("event_id", ids);
      const map = new Map<string, number>();
      (counts ?? []).forEach((t: any) => map.set(t.event_id, (map.get(t.event_id) ?? 0) + 1));
      return (data ?? []).map((e: any) => ({ ...e, ticket_count: map.get(e.id) ?? 0 }));
    },
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Events</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create and manage your events.</p>
        </div>
        <Link
          to="/events/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> New event
        </Link>
      </div>

      {isLoading ? (
        <div className="mt-10 text-muted-foreground">Loading…</div>
      ) : !events?.length ? (
        <div className="mt-10 rounded-xl border border-dashed bg-card p-12 text-center">
          <Calendar className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 font-semibold">No events yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Create your first event to start issuing tickets.</p>
          <Link
            to="/events/new"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> New event
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e: any) => (
            <Link
              key={e.id}
              to="/events/$id"
              params={{ id: e.id }}
              className="group overflow-hidden rounded-xl border bg-card shadow-sm transition hover:shadow-md"
            >
              <div className="aspect-[3/2] bg-gradient-to-br from-primary/20 to-accent grid place-items-center">
                <Ticket className="h-10 w-10 text-primary/60 transition group-hover:scale-110" />
              </div>
              <div className="p-5">
                <h3 className="line-clamp-1 font-semibold">{e.name}</h3>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(e.event_date).toLocaleString()}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {e.venue}
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-sm">
                  <Ticket className="h-4 w-4 text-primary" />
                  <span className="font-medium">{e.ticket_count}</span>
                  <span className="text-muted-foreground">tickets</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
