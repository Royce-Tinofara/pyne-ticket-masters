import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getSignedDesignUrl } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Upload, Trash2, Printer, Plus, ExternalLink } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export const Route = createFileRoute("/_authenticated/events/$id")({
  component: EventDetail,
});

type EventRow = {
  id: string;
  name: string;
  event_date: string;
  venue: string;
  ticket_design_url: string | null;
  template: any;
};

function EventDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").eq("id", id).single();
      if (error) throw error;
      return data as EventRow;
    },
  });

  if (isLoading || !event) return <main className="mx-auto max-w-6xl px-4 py-8">Loading…</main>;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link to="/events" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to events
      </Link>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{event.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(event.event_date).toLocaleString()} · {event.venue}
          </p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={async () => {
            if (!confirm("Delete this event and all its tickets?")) return;
            const { error } = await supabase.from("events").delete().eq("id", id);
            if (error) return toast.error(error.message);
            toast.success("Event deleted");
            qc.invalidateQueries({ queryKey: ["events"] });
            navigate({ to: "/events" });
          }}
        >
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>

      <Tabs defaultValue="details" className="mt-6">
        <TabsList>
          <TabsTrigger value="details">Details & Design</TabsTrigger>
          <TabsTrigger value="generate">Generate tickets</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="print">Print</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <DetailsTab event={event} onUpdate={() => qc.invalidateQueries({ queryKey: ["event", id] })} />
        </TabsContent>
        <TabsContent value="generate" className="mt-6">
          <GenerateTab eventId={id} />
        </TabsContent>
        <TabsContent value="tickets" className="mt-6">
          <TicketsTab eventId={id} />
        </TabsContent>
        <TabsContent value="print" className="mt-6">
          <PrintTab event={event} />
        </TabsContent>
      </Tabs>
    </main>
  );
}

// --- DETAILS + DESIGN + TEMPLATE -------------------------------------------------
function DetailsTab({ event, onUpdate }: { event: EventRow; onUpdate: () => void }) {
  const [name, setName] = useState(event.name);
  const [date, setDate] = useState(new Date(event.event_date).toISOString().slice(0, 16));
  const [venue, setVenue] = useState(event.venue);
  const [template, setTemplate] = useState(event.template);
  const [uploading, setUploading] = useState(false);
  const [designUrl, setDesignUrl] = useState<string | null>(null);

  useEffect(() => {
    getSignedDesignUrl(event.ticket_design_url).then(setDesignUrl);
  }, [event.ticket_design_url]);

  async function save() {
    const { error } = await supabase
      .from("events")
      .update({
        name,
        event_date: new Date(date).toISOString(),
        venue,
        template,
        updated_at: new Date().toISOString(),
      })
      .eq("id", event.id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    onUpdate();
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${event.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("ticket-designs").upload(path, file, { upsert: true });
    if (upErr) {
      setUploading(false);
      return toast.error(upErr.message);
    }
    const { error: dbErr } = await supabase
      .from("events")
      .update({ ticket_design_url: path })
      .eq("id", event.id);
    setUploading(false);
    if (dbErr) return toast.error(dbErr.message);
    toast.success("Design uploaded");
    onUpdate();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-5 rounded-xl border bg-card p-6">
        <h3 className="font-semibold">Event details</h3>
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Date & time</Label>
          <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <Label>Venue</Label>
          <Input value={venue} onChange={(e) => setVenue(e.target.value)} />
        </div>

        <h3 className="pt-4 font-semibold">Ticket design</h3>
        <div className="flex items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent">
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading…" : "Upload image"}
            <input type="file" accept="image/*" hidden onChange={onUpload} disabled={uploading} />
          </label>
          {event.ticket_design_url && <span className="text-xs text-muted-foreground">Uploaded</span>}
        </div>

        <h3 className="pt-4 font-semibold">Template (mm)</h3>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Width" value={template.width_mm} onChange={(v) => setTemplate({ ...template, width_mm: v })} />
          <NumField label="Height" value={template.height_mm} onChange={(v) => setTemplate({ ...template, height_mm: v })} />
          <NumField label="QR X" value={template.qr.x} onChange={(v) => setTemplate({ ...template, qr: { ...template.qr, x: v } })} />
          <NumField label="QR Y" value={template.qr.y} onChange={(v) => setTemplate({ ...template, qr: { ...template.qr, y: v } })} />
          <NumField label="QR Size" value={template.qr.size} onChange={(v) => setTemplate({ ...template, qr: { ...template.qr, size: v } })} />
          <NumField label="Serial X" value={template.serial.x} onChange={(v) => setTemplate({ ...template, serial: { ...template.serial, x: v } })} />
          <NumField label="Serial Y" value={template.serial.y} onChange={(v) => setTemplate({ ...template, serial: { ...template.serial, y: v } })} />
          <NumField label="Serial Font (pt)" value={template.serial.font_size} onChange={(v) => setTemplate({ ...template, serial: { ...template.serial, font_size: v } })} />
        </div>

        <Button onClick={save} className="w-full">Save changes</Button>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-3 font-semibold">Preview</h3>
        <TicketPreview designUrl={designUrl} template={template} serial="PYNE-0001" code="preview-code" />
      </div>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

// --- Reusable TicketPreview ------------------------------------------------------
export function TicketPreview({
  designUrl,
  template,
  serial,
  code,
  scale = 2,
}: {
  designUrl: string | null;
  template: any;
  serial: string;
  code: string;
  scale?: number;
}) {
  // scale factor: mm -> px on screen
  const w = template.width_mm * scale;
  const h = template.height_mm * scale;
  const qrSize = template.qr.size * scale;
  return (
    <div
      className="relative overflow-hidden rounded-md border bg-white shadow"
      style={{ width: w, height: h, maxWidth: "100%" }}
    >
      {designUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={designUrl} alt="design" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
          No design uploaded
        </div>
      )}
      <div
        className="absolute bg-white p-1"
        style={{ left: template.qr.x * scale, top: template.qr.y * scale, width: qrSize, height: qrSize }}
      >
        <QRCodeSVG value={`${typeof window !== "undefined" ? window.location.origin : ""}/verify/${code}`} size={qrSize - 8} level="M" />
      </div>
      <div
        className="absolute font-mono font-semibold text-black"
        style={{
          left: template.serial.x * scale,
          top: template.serial.y * scale,
          fontSize: template.serial.font_size * scale * 0.5,
        }}
      >
        {serial}
      </div>
    </div>
  );
}

// --- GENERATE --------------------------------------------------------------------
function GenerateTab({ eventId }: { eventId: string }) {
  const qc = useQueryClient();
  const [count, setCount] = useState(50);
  const [prefix, setPrefix] = useState("PYNE-");
  const [start, setStart] = useState(1);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    setProgress(0);
    setPreview([]);
    const total = count;
    const batchSize = 200;
    let inserted = 0;
    for (let i = 0; i < total; i += batchSize) {
      const rows = Array.from({ length: Math.min(batchSize, total - i) }, (_, j) => ({
        event_id: eventId,
        serial_number: `${prefix}${start + i + j}`,
      }));
      const { data, error } = await supabase.from("tickets").insert(rows).select();
      if (error) {
        setBusy(false);
        return toast.error(error.message);
      }
      inserted += data.length;
      if (preview.length < 10) setPreview((p) => [...p, ...data].slice(0, 10));
      setProgress(Math.round((inserted / total) * 100));
    }
    setBusy(false);
    toast.success(`Generated ${inserted} tickets`);
    qc.invalidateQueries({ queryKey: ["tickets", eventId] });
    qc.invalidateQueries({ queryKey: ["stats"] });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-xl border bg-card p-6">
        <h3 className="font-semibold">Generate tickets</h3>
        <div>
          <Label>Number of tickets</Label>
          <Input type="number" min={1} max={5000} value={count} onChange={(e) => setCount(Number(e.target.value))} />
        </div>
        <div>
          <Label>Serial prefix</Label>
          <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} />
        </div>
        <div>
          <Label>Starting number</Label>
          <Input type="number" value={start} onChange={(e) => setStart(Number(e.target.value))} />
        </div>
        <Button onClick={generate} disabled={busy} className="w-full">
          <Plus className="h-4 w-4" /> {busy ? `Generating… ${progress}%` : `Generate ${count} tickets`}
        </Button>
        {busy && (
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold">First 10 preview</h3>
        {preview.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Generated tickets will appear here.</p>
        ) : (
          <ul className="mt-3 divide-y text-sm">
            {preview.map((t) => (
              <li key={t.id} className="flex justify-between py-2 font-mono">
                <span>{t.serial_number}</span>
                <span className="text-xs text-muted-foreground">{t.verification_code.slice(0, 8)}…</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// --- TICKETS LIST ----------------------------------------------------------------
function TicketsTab({ eventId }: { eventId: string }) {
  const { data: tickets } = useQuery({
    queryKey: ["tickets", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("event_id", eventId)
        .order("serial_number");
      if (error) throw error;
      return data;
    },
  });

  if (!tickets) return <div>Loading…</div>;
  if (!tickets.length) return <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">No tickets yet. Generate some on the previous tab.</div>;

  return (
    <div className="rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-left">
          <tr>
            <th className="p-3">Serial</th>
            <th className="p-3">Status</th>
            <th className="p-3">Used at</th>
            <th className="p-3">Verify link</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {tickets.map((t: any) => (
            <tr key={t.id}>
              <td className="p-3 font-mono">{t.serial_number}</td>
              <td className="p-3">
                <span
                  className={`rounded px-2 py-0.5 text-xs ${
                    t.status === "valid"
                      ? "bg-emerald-100 text-emerald-700"
                      : t.status === "used"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {t.status}
                </span>
              </td>
              <td className="p-3 text-muted-foreground">{t.used_at ? new Date(t.used_at).toLocaleString() : "—"}</td>
              <td className="p-3">
                <a
                  href={`/verify/${t.verification_code}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  open <ExternalLink className="h-3 w-3" />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- PRINT -----------------------------------------------------------------------
function PrintTab({ event }: { event: EventRow }) {
  const [perPage, setPerPage] = useState<4 | 6 | 8>(8);
  const [size, setSize] = useState<"A5" | "A6">("A5");
  const [designUrl, setDesignUrl] = useState<string | null>(null);

  useEffect(() => {
    getSignedDesignUrl(event.ticket_design_url).then(setDesignUrl);
  }, [event.ticket_design_url]);

  const { data: tickets } = useQuery({
    queryKey: ["tickets", event.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("serial_number, verification_code")
        .eq("event_id", event.id)
        .order("serial_number");
      if (error) throw error;
      return data;
    },
  });

  // Layout config per perPage option.
  // 8-up = 4 cols × 2 rows filling A4 portrait (each ticket ≈ 52.5mm × 148.5mm)
  // 6-up = 3 cols × 2 rows (each ≈ 70mm × 148.5mm)
  // 4-up = 2 cols × 2 rows A5-ish (each ≈ 105mm × 148.5mm)
  const layout =
    perPage === 8
      ? { cols: 4, width_mm: 52.5, height_mm: 148.5 }
      : perPage === 6
      ? { cols: 3, width_mm: 70, height_mm: 148.5 }
      : { cols: 2, width_mm: 105, height_mm: 148.5 };

  // Convert mm → on-screen px at 96dpi so print mm matches exactly.
  const MM_TO_PX = 96 / 25.4;
  const scale =
    perPage === 8
      ? MM_TO_PX
      : perPage === 6
      ? MM_TO_PX
      : size === "A5"
      ? MM_TO_PX
      : MM_TO_PX;

  const dims = { width_mm: layout.width_mm, height_mm: layout.height_mm };
  const template = { ...event.template, ...dims };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4 print:hidden">
        <div>
          <Label className="text-xs">Tickets per page</Label>
          <div className="mt-1 flex gap-1">
            {([4, 6, 8] as const).map((n) => (
              <Button key={n} size="sm" variant={perPage === n ? "default" : "outline"} onClick={() => setPerPage(n)}>{n}</Button>
            ))}
          </div>
        </div>
        {perPage === 4 && (
          <div>
            <Label className="text-xs">Ticket size</Label>
            <div className="mt-1 flex gap-1">
              {(["A5", "A6"] as const).map((n) => (
                <Button key={n} size="sm" variant={size === n ? "default" : "outline"} onClick={() => setSize(n)}>{n}</Button>
              ))}
            </div>
          </div>
        )}
        <Button onClick={() => window.print()} className="ml-auto"><Printer className="h-4 w-4" /> Print</Button>
      </div>

      <div className="print-area">
        {!tickets?.length ? (
          <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">No tickets to print.</div>
        ) : (
          chunk(tickets, perPage).map((page, pi) => (
            <div
              key={pi}
              className="print-page mx-auto mb-6 grid bg-white shadow"
              style={{
                gridTemplateColumns: `repeat(${layout.cols}, ${layout.width_mm}mm)`,
                gridAutoRows: `${layout.height_mm}mm`,
                width: "210mm",
                height: "297mm",
                gap: 0,
                padding: 0,
              }}
            >
              {page.map((t: any) => (
                <div key={t.verification_code} className="overflow-hidden">
                  <TicketPreview designUrl={designUrl} template={template} serial={t.serial_number} code={t.verification_code} scale={scale} />
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; inset: 0; }
          .print-page { page-break-after: always; box-shadow: none !important; border: none !important; }
        }
      `}</style>
    </div>
  );
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}
