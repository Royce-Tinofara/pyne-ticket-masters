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
          <TabsTrigger value="ticketTypes">Ticket Types</TabsTrigger>
          <TabsTrigger value="generate">Generate tickets</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="print">Print</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <DetailsTab event={event} onUpdate={() => qc.invalidateQueries({ queryKey: ["event", id] })} />
        </TabsContent>
        <TabsContent value="ticketTypes" className="mt-6">
          <TicketTypesTab eventId={id} />
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
  showSize = false,
}: {
  designUrl: string | null;
  template: any;
  serial: string;
  code: string;
  scale?: number;
  showSize?: boolean;
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
      {showSize && (
        <div className="absolute bottom-1 right-1 rounded bg-slate-900/70 px-1.5 py-0.5 text-white" style={{ fontSize: 8 * scale * 0.35 }}>
          {template.width_mm}×{template.height_mm}mm
        </div>
      )}
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

// --- TICKET TYPES ----------------------------------------------------------------
function TicketTypesTab({ eventId }: { eventId: string }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: types } = useQuery({
    queryKey: ["ticket-types", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_types")
        .select("*")
        .eq("event_id", eventId)
        .order("price", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: soldCounts } = useQuery({
    queryKey: ["sold-counts", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("ticket_type_id")
        .eq("event_id", eventId)
        .not("ticket_type_id", "is", null);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data ?? []).forEach((t) => {
        if (t.ticket_type_id) {
          counts[t.ticket_type_id] = (counts[t.ticket_type_id] ?? 0) + 1;
        }
      });
      return counts;
    },
  });

  async function saveType() {
    if (!name.trim() || !price || !quantity) {
      toast.error("Fill in all required fields");
      return;
    }

    const row = {
      event_id: eventId,
      name: name.trim(),
      description: description.trim() || null,
      price: parseFloat(price),
      quantity_total: parseInt(quantity),
    };

    if (editingId) {
      const { error } = await supabase
        .from("ticket_types")
        .update(row)
        .eq("id", editingId);
      if (error) return toast.error(error.message);
      toast.success("Ticket type updated");
    } else {
      const { error } = await supabase.from("ticket_types").insert(row);
      if (error) return toast.error(error.message);
      toast.success("Ticket type created");
    }

    resetForm();
    qc.invalidateQueries({ queryKey: ["ticket-types", eventId] });
  }

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setDescription("");
    setPrice("");
    setQuantity("");
  }

  function editType(type: any) {
    setEditingId(type.id);
    setName(type.name);
    setDescription(type.description || "");
    setPrice(type.price.toString());
    setQuantity(type.quantity_total.toString());
    setShowForm(true);
  }

  async function deleteType(id: string) {
    if (!confirm("Delete this ticket type?")) return;
    const { error } = await supabase.from("ticket_types").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["ticket-types", eventId] });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Create ticket categories that visitors can purchase on the public event page.
        </p>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add Ticket Type"}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h3 className="font-semibold">{editingId ? "Edit" : "New"} Ticket Type</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., General Admission, VIP" />
            </div>
            <div>
              <Label>Price ($) *</Label>
              <Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div>
              <Label>Quantity Available *</Label>
              <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={saveType}>{editingId ? "Update" : "Create"}</Button>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
          </div>
        </div>
      )}

      {!types?.length && !showForm ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          No ticket types yet. Add ticket types to enable public purchases.
        </div>
      ) : (
        <div className="rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Price</th>
                <th className="p-3">Available</th>
                <th className="p-3">Sold</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {types?.map((t: any) => {
                const sold = soldCounts?.[t.id] ?? 0;
                return (
                  <tr key={t.id}>
                    <td className="p-3">
                      <div>
                        <p className="font-medium">{t.name}</p>
                        {t.description && (
                          <p className="text-xs text-muted-foreground">{t.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="p-3">${t.price.toFixed(2)}</td>
                    <td className="p-3">{t.quantity_total}</td>
                    <td className="p-3">
                      <span className={sold >= t.quantity_total ? "text-red-500 font-medium" : ""}>
                        {sold}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => editType(t)}>Edit</Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteType(t.id)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
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
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (!tickets) return <div>Loading…</div>;
  if (!tickets.length) return <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">No tickets yet. Create ticket types to enable purchases, or generate tickets manually.</div>;

  return (
    <div className="rounded-xl border bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-left">
          <tr>
            <th className="p-3">Serial</th>
            <th className="p-3">Type</th>
            <th className="p-3">Price</th>
            <th className="p-3">Buyer</th>
            <th className="p-3">Status</th>
            <th className="p-3">Used at</th>
            <th className="p-3">Verify</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {tickets.map((t: any) => (
            <tr key={t.id}>
              <td className="p-3 font-mono text-xs">{t.serial_number}</td>
              <td className="p-3">{t.ticket_type || "—"}</td>
              <td className="p-3">{t.price != null ? `$${t.price.toFixed(2)}` : "—"}</td>
              <td className="p-3">
                {t.buyer_name ? (
                  <div>
                    <p className="font-medium">{t.buyer_name}</p>
                    <p className="text-xs text-muted-foreground">{t.buyer_email}</p>
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
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
              <td className="p-3 text-muted-foreground text-xs">{t.used_at ? new Date(t.used_at).toLocaleString() : "—"}</td>
              <td className="p-3">
                <a
                  href={`/verify/${t.verification_code}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                >
                  view <ExternalLink className="h-3 w-3" />
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
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [designUrl, setDesignUrl] = useState<string | null>(null);
  const [showDimensions, setShowDimensions] = useState(true);

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
  const baseLayout =
    perPage === 8
      ? { cols: 4, width_mm: 52.5, height_mm: 148.5 }
      : perPage === 6
      ? { cols: 3, width_mm: 70, height_mm: 148.5 }
      : { cols: 2, width_mm: 105, height_mm: 148.5 };

  // Swap dimensions if rotated 90 or 270 degrees
  const isRotated90or270 = rotation === 90 || rotation === 270;
  const layout = isRotated90or270
    ? { ...baseLayout, width_mm: baseLayout.height_mm, height_mm: baseLayout.width_mm }
    : baseLayout;

  // Convert mm → on-screen px at 96dpi so print mm matches exactly.
  const MM_TO_PX = 96 / 25.4;

  const dims = { width_mm: layout.width_mm, height_mm: layout.height_mm };
  const template = { ...event.template, ...dims };

  // Preview scale (scaled down to fit screen)
  const PREVIEW_SCALE = 0.35;
  // Print scale (exact mm to px at 96dpi)
  const PRINT_SCALE = MM_TO_PX;

  return (
    <div className="space-y-6">
      {/* Control Panel */}
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
        <div>
          <Label className="text-xs">Rotation</Label>
          <div className="mt-1 flex gap-1">
            {([0, 90, 180, 270] as const).map((r) => (
              <Button key={r} size="sm" variant={rotation === r ? "default" : "outline"} onClick={() => setRotation(r)}>
                {r}°
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showDimensions"
            checked={showDimensions}
            onChange={(e) => setShowDimensions(e.target.checked)}
            className="h-4 w-4"
          />
          <Label htmlFor="showDimensions" className="text-xs cursor-pointer">Show dimensions</Label>
        </div>
        <Button onClick={() => window.print()} className="ml-auto"><Printer className="h-4 w-4" /> Print</Button>
      </div>

      {/* Ticket Size Info */}
      <div className="rounded-xl border bg-card p-4 print:hidden">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">Ticket size: </span>
            <span className="font-medium">{layout.width_mm} × {layout.height_mm} mm</span>
          </div>
          <div>
            <span className="text-muted-foreground">Grid: </span>
            <span className="font-medium">{layout.cols} cols × {perPage / layout.cols} rows</span>
          </div>
          <div>
            <span className="text-muted-foreground">Rotation: </span>
            <span className="font-medium">{rotation}°</span>
          </div>
          <div>
            <span className="text-muted-foreground">A4 page: </span>
            <span className="font-medium">210 × 297 mm</span>
          </div>
        </div>
      </div>

      {/* Print Preview Container - Shows actual A4 page at scaled size */}
      <div className="print:hidden">
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Print Preview (A4 page)</h3>
        <div className="overflow-auto rounded-xl border bg-slate-100 p-4">
          <div
            className="relative mx-auto bg-white shadow-lg"
            style={{
              width: `210mm`,
              height: `297mm`,
              transform: `scale(${PREVIEW_SCALE})`,
              transformOrigin: "top center",
            }}
          >
            {/* Grid overlay showing ticket boundaries */}
            <div
              className="absolute inset-0 grid"
              style={{
                gridTemplateColumns: `repeat(${layout.cols}, ${layout.width_mm}mm)`,
                gridAutoRows: `${layout.height_mm}mm`,
              }}
            >
              {Array.from({ length: perPage }).map((_, i) => (
                <div
                  key={i}
                  className="relative border border-slate-200"
                >
                  {/* Ticket preview for first page */}
                  {tickets?.[i] && (
                    <div className="absolute inset-0 overflow-hidden" style={{ transform: `rotate(${rotation}deg)`, transformOrigin: "center center" }}>
                      <TicketPreview
                        designUrl={designUrl}
                        template={template}
                        serial={tickets[i].serial_number}
                        code={tickets[i].verification_code}
                        scale={PRINT_SCALE}
                      />
                    </div>
                  )}
                  {/* Dimension label */}
                  {showDimensions && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="rounded bg-slate-900/80 px-2 py-1 text-xs text-white">
                        {layout.width_mm} × {layout.height_mm} mm
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Page size indicator */}
            <div className="absolute -right-16 top-0 flex h-full flex-col items-center justify-center text-xs text-slate-500">
              <div className="writing-mode-vertical" style={{ writingMode: "vertical-rl" }}>297mm</div>
            </div>
            <div className="absolute -bottom-8 left-0 right-0 text-center text-xs text-slate-500">210mm</div>
          </div>
        </div>
      </div>

      {/* Actual Print Area */}
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
                <div key={t.verification_code} className="overflow-hidden" style={{ transform: `rotate(${rotation}deg)`, transformOrigin: "center center" }}>
                  <TicketPreview designUrl={designUrl} template={template} serial={t.serial_number} code={t.verification_code} scale={PRINT_SCALE} />
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
