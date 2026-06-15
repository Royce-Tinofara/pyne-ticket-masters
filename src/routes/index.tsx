import { createFileRoute, Link } from "@tanstack/react-router";
import { Ticket, ScanLine, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pyne App Ticket-Masters" },
      { name: "description", content: "Create, print, and verify event tickets with QR codes." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/30">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Ticket className="h-5 w-5" />
            </div>
            <span className="font-semibold tracking-tight">Pyne App Ticket-Masters</span>
          </div>
          <Link
            to="/auth"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-20">
        <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
          Event ticketing,
          <br />
          <span className="text-primary">end to end.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Design tickets, generate serialized QR codes in bulk, print them on A4 sheets, and validate
          them at the door with any phone camera.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            to="/auth"
            className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Get started
          </Link>
        </div>

        <div className="mt-20 grid gap-6 sm:grid-cols-3">
          {[
            { icon: Ticket, title: "Design & Generate", body: "Upload artwork, configure QR & serial placement, generate thousands of unique tickets." },
            { icon: ScanLine, title: "Scan at the door", body: "Mobile-first camera scanner with valid / used / invalid states and manual entry." },
            { icon: ShieldCheck, title: "Public verification", body: "Share a /verify link so anyone can confirm a ticket's status." },
          ].map((f, i) => (
            <div key={i} className="rounded-xl border bg-card p-6 shadow-sm">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-semibold text-card-foreground">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
