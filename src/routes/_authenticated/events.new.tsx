import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/events/new")({
  component: NewEvent,
});

function NewEvent() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [venue, setVenue] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data: user } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("events")
      .insert({
        name,
        event_date: new Date(date).toISOString(),
        venue,
        created_by: user.user?.id,
      })
      .select()
      .single();
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Event created");
    navigate({ to: "/events/$id", params: { id: data.id } });
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link to="/events" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to events
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">New event</h1>

      <form onSubmit={submit} className="mt-8 space-y-5 rounded-xl border bg-card p-6">
        <div>
          <Label htmlFor="name">Event name</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="date">Date & time</Label>
          <Input id="date" type="datetime-local" required value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="venue">Venue</Label>
          <Input id="venue" required value={venue} onChange={(e) => setVenue(e.target.value)} />
        </div>
        <Button type="submit" disabled={loading} className="w-full">Create event</Button>
      </form>
    </main>
  );
}
