import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Ticket, Calendar, MapPin, Tag, Clock } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pyne App Ticket-Masters" },
      { name: "description", content: "Buy tickets for upcoming events or manage your own events with QR code tickets." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { data: events, isLoading } = useQuery({
    queryKey: ["public-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, name, event_date, venue")
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/30">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Ticket className="h-5 w-5" />
            </div>
            <span className="font-semibold tracking-tight">Pyne App Ticket-Masters</span>
          </Link>
          <Link
            to="/auth"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        {/* Hero Section */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Find your next event
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            Browse upcoming events and purchase tickets instantly. No account required.
          </p>
        </div>

        {/* Events Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="h-6 w-6 text-primary" />
              Upcoming Events
            </h2>
          </div>

          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse rounded-xl border bg-card p-5">
                  <div className="h-40 bg-muted rounded-lg mb-4" />
                  <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : events?.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-card p-12 text-center">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No upcoming events</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Check back soon for new events!
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events?.map((event) => (
                <Link
                  key={event.id}
                  to="/events/$id/buy"
                  params={{ id: event.id }}
                  className="group overflow-hidden rounded-xl border bg-card shadow-sm transition hover:shadow-lg hover:border-primary/50"
                >
                  <div className="aspect-[2/1] bg-gradient-to-br from-primary/20 via-accent/30 to-primary/10 grid place-items-center">
                    <Ticket className="h-12 w-12 text-primary/50 transition group-hover:scale-110" />
                  </div>
                  <div className="p-5">
                    <h3 className="line-clamp-2 text-lg font-semibold group-hover:text-primary transition">
                      {event.name}
                    </h3>
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 text-primary" />
                        {new Date(event.event_date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 text-primary" />
                        {new Date(event.event_date).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="line-clamp-1">{event.venue}</span>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm font-medium text-primary">View tickets</span>
                      <Tag className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Features Section */}
        <div className="mt-20 grid gap-6 sm:grid-cols-3">
          {[
            { icon: Ticket, title: "Instant Tickets", body: "Purchase tickets in seconds. No account needed - just provide your email and you're done." },
            { icon: Calendar, title: "Event Management", body: "Organizing an event? Sign in to create events, design tickets, and track attendance." },
            { icon: ShieldCheck, title: "Secure Verification", body: "Each ticket has a unique QR code for instant verification at the door." },
          ].map((f, i) => (
            <div key={i} className="rounded-xl border bg-card p-6 shadow-sm">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-semibold text-card-foreground">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="mt-20 border-t py-8 text-center text-sm text-muted-foreground">
        <p>Pyne App Ticket-Masters - Event ticketing made simple</p>
      </footer>
    </div>
  );
}
