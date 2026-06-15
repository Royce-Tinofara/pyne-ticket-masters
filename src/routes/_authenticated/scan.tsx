import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, AlertTriangle, RotateCcw, Camera, KeyRound } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/scan")({
  component: ScanPage,
});

type Lookup =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "valid"; ticket: any; event: any }
  | { state: "used"; ticket: any; event: any }
  | { state: "invalid"; code: string };

function ScanPage() {
  const [result, setResult] = useState<Lookup>({ state: "idle" });
  const [manual, setManual] = useState("");
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const elementId = "qr-reader";

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  async function startScanner() {
    if (scanning) return;
    setScanning(true);
    try {
      const html5 = new Html5Qrcode(elementId);
      scannerRef.current = html5;
      await html5.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 300, height: 300 } },
        async (decoded) => {
          await html5.stop();
          setScanning(false);
          const code = extractCode(decoded);
          await lookup(code);
        },
        () => {}
      );
    } catch (e: any) {
      setScanning(false);
      toast.error(e.message || "Camera error");
    }
  }

  async function stopScanner() {
    if (scannerRef.current?.isScanning) await scannerRef.current.stop();
    setScanning(false);
  }

  function extractCode(decoded: string) {
    const m = decoded.match(/\/verify\/([0-9a-fA-F-]{36})/);
    if (m) return m[1];
    return decoded.trim();
  }

  async function lookup(code: string) {
    setResult({ state: "loading" });
    const { data, error } = await supabase
      .from("tickets")
      .select("*, events(name, event_date, venue)")
      .eq("verification_code", code)
      .maybeSingle();
    if (error || !data) {
      setResult({ state: "invalid", code });
      return;
    }
    if (data.status === "used")
      setResult({ state: "used", ticket: data, event: (data as any).events });
    else if (data.status === "valid")
      setResult({ state: "valid", ticket: data, event: (data as any).events });
    else setResult({ state: "invalid", code });
  }

  async function markUsed() {
    if (result.state !== "valid") return;
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("tickets")
      .update({ status: "used", used_at: new Date().toISOString(), used_by: u.user?.id })
      .eq("id", result.ticket.id)
      .eq("status", "valid")
      .select()
      .single();
    if (error || !data) return toast.error("Could not mark used (already used?)");
    toast.success("Admitted ✓");
    setResult({ state: "used", ticket: data, event: result.event });
  }

  function reset() {
    setResult({ state: "idle" });
    setManual("");
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight">Ticket Scanner</h1>
      <p className="text-sm text-muted-foreground">Point the camera at a ticket QR code.</p>

      <div className="mt-5 overflow-hidden rounded-xl border bg-black">
        <div id={elementId} className="aspect-square w-full" />
      </div>

      <div className="mt-3 flex gap-2">
        {!scanning ? (
          <Button onClick={startScanner} className="flex-1"><Camera className="h-4 w-4" /> Start camera</Button>
        ) : (
          <Button onClick={stopScanner} variant="secondary" className="flex-1">Stop</Button>
        )}
        <Button onClick={reset} variant="outline"><RotateCcw className="h-4 w-4" /> Reset</Button>
      </div>

      <div className="mt-5 rounded-xl border bg-card p-4">
        <label className="text-sm font-medium">Manual entry</label>
        <div className="mt-2 flex gap-2">
          <Input placeholder="Verification code" value={manual} onChange={(e) => setManual(e.target.value)} />
          <Button onClick={() => lookup(extractCode(manual))} disabled={!manual}><KeyRound className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="mt-5">
        <ResultCard result={result} onAdmit={markUsed} />
      </div>
    </main>
  );
}

function ResultCard({ result, onAdmit }: { result: Lookup; onAdmit: () => void }) {
  if (result.state === "idle") return null;
  if (result.state === "loading") return <div className="rounded-xl border p-6 text-center">Checking…</div>;

  if (result.state === "valid")
    return (
      <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50 p-6 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
        <div className="mt-2 text-2xl font-bold text-emerald-700">VALID — Admit One</div>
        <div className="mt-3 font-mono text-lg">{result.ticket.serial_number}</div>
        <div className="text-sm text-emerald-900/70">
          {result.event?.name} · {result.event && new Date(result.event.event_date).toLocaleString()}
        </div>
        <Button onClick={onAdmit} className="mt-5 w-full bg-emerald-600 hover:bg-emerald-700">MARK AS USED</Button>
      </div>
    );

  if (result.state === "used")
    return (
      <div className="rounded-xl border-2 border-red-500 bg-red-50 p-6 text-center">
        <XCircle className="mx-auto h-14 w-14 text-red-600" />
        <div className="mt-2 text-2xl font-bold text-red-700">ALREADY USED</div>
        <div className="mt-3 font-mono text-lg">{result.ticket.serial_number}</div>
        <div className="text-sm text-red-900/70">
          Used {result.ticket.used_at && new Date(result.ticket.used_at).toLocaleString()}
        </div>
      </div>
    );

  return (
    <div className="rounded-xl border-2 border-amber-500 bg-amber-50 p-6 text-center">
      <AlertTriangle className="mx-auto h-14 w-14 text-amber-600" />
      <div className="mt-2 text-2xl font-bold text-amber-700">INVALID TICKET</div>
      <div className="mt-2 text-xs text-amber-900/70 break-all">{result.code}</div>
    </div>
  );
}
