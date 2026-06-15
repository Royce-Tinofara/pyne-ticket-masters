import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { ArrowLeft, Calendar, Clock, MapPin, Ticket, Loader as Loader2 } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/events/$id/buy")({
  component: BuyTickets,
});

type TicketType = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  quantity_total: number;
};

type EventData = {
  id: string;
  name: string;
  event_date: string;
  venue: string;
  ticket_design_url: string | null;
};

function BuyTickets() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState<"select" | "checkout" | "confirm">("select");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [purchasedCodes, setPurchasedCodes] = useState<string[]>([]);

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["public-event", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, name, event_date, venue, ticket_design_url")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as EventData;
    },
  });

  const { data: ticketTypes, isLoading: typesLoading } = useQuery({
    queryKey: ["ticket-types", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_types")
        .select("*")
        .eq("event_id", id);
      if (error) throw error;
      return (data ?? []) as TicketType[];
    },
  });

  const { data: soldCounts } = useQuery({
    queryKey: ["sold-counts", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("ticket_type_id")
        .eq("event_id", id)
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

  if (eventLoading || typesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Event not found</h1>
        <Link to="/" className="text-primary hover:underline">
          Browse events
        </Link>
      </div>
    );
  }

  const selectedTicketType = ticketTypes.find((t) => t.id === selectedType);
  const soldCount = selectedType ? (soldCounts?.[selectedType] ?? 0) : 0;
  const remaining = selectedTicketType ? selectedTicketType.quantity_total - soldCount : 0;
  const totalPrice = selectedTicketType ? selectedTicketType.price * quantity : 0;

  async function handlePurchase() {
    if (!selectedType || !buyerName.trim() || !buyerEmail.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);

    try {
      // Generate tickets
      const rows = Array.from({ length: quantity }, () => ({
        event_id: id,
        ticket_type_id: selectedType,
        ticket_type: selectedTicketType?.name ?? null,
        price: selectedTicketType?.price ?? 0,
        buyer_name: buyerName.trim(),
        buyer_email: buyerEmail.trim().toLowerCase(),
        buyer_phone: buyerPhone.trim() || null,
        serial_number: `${id.slice(0, 8).toUpperCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      }));

      const { data, error } = await supabase
        .from("tickets")
        .insert(rows)
        .select("verification_code");

      if (error) throw error;

      setPurchasedCodes(data.map((t) => t.verification_code));
      setStep("confirm");
      toast.success(`Successfully purchased ${quantity} ticket(s)!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to complete purchase");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/30">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Ticket className="h-5 w-5" />
            </div>
            <span className="font-semibold tracking-tight">Pyne App</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to events
        </Link>

        {/* Event Header */}
        <div className="rounded-xl border bg-card p-6 mb-6">
          <h1 className="text-2xl font-bold">{event.name}</h1>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              {new Date(event.event_date).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              {new Date(event.event_date).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              {event.venue}
            </div>
          </div>
        </div>

        {/* Ticket Selection or Checkout or Confirmation */}
        {step === "select" && (
          <Card>
            <CardHeader>
              <CardTitle>Select Tickets</CardTitle>
              <CardDescription>Choose your ticket type and quantity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {ticketTypes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No tickets available for this event yet.</p>
                  <p className="text-sm mt-2">Please check back later.</p>
                </div>
              ) : (
                <>
                  <RadioGroup value={selectedType ?? ""} onValueChange={setSelectedType}>
                    {ticketTypes.map((type) => {
                      const sold = soldCounts?.[type.id] ?? 0;
                      const left = type.quantity_total - sold;
                      const isSoldOut = left <= 0;
                      return (
                        <div
                          key={type.id}
                          className={`flex items-center justify-between rounded-lg border p-4 ${
                            isSoldOut ? "opacity-50 cursor-not-allowed" : ""
                          } ${selectedType === type.id ? "border-primary bg-primary/5" : ""}`}
                        >
                          <div className="flex items-start gap-4">
                            <RadioGroupItem value={type.id} disabled={isSoldOut} className="mt-1" />
                            <div>
                              <p className="font-medium">{type.name}</p>
                              {type.description && (
                                <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                              )}
                              <p className="text-sm text-muted-foreground mt-1">
                                {isSoldOut ? (
                                  <span className="text-red-500 font-medium">Sold out</span>
                                ) : (
                                  `${left} remaining`
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold">${type.price.toFixed(2)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </RadioGroup>

                  {selectedType && remaining > 0 && (
                    <div className="flex items-center gap-4">
                      <Label>Quantity:</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          disabled={quantity <= 1}
                        >
                          -
                        </Button>
                        <span className="w-12 text-center font-medium">{quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setQuantity(Math.min(remaining, quantity + 1))}
                          disabled={quantity >= remaining}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  )}

                  {selectedType && remaining > 0 && (
                    <div className="flex items-center justify-between border-t pt-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-2xl font-bold">${totalPrice.toFixed(2)}</p>
                      </div>
                      <Button onClick={() => setStep("checkout")} size="lg">
                        Continue to Checkout
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {step === "checkout" && (
          <Card>
            <CardHeader>
              <CardTitle>Checkout</CardTitle>
              <CardDescription>Enter your details to complete the purchase</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Order Summary */}
              <div className="rounded-lg bg-muted/50 p-4">
                <h3 className="font-medium mb-2">Order Summary</h3>
                <div className="flex justify-between text-sm">
                  <span>{selectedTicketType?.name} × {quantity}</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium mt-2 pt-2 border-t">
                  <span>Total</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
              </div>

              {/* Buyer Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="john@example.com"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Your tickets will be sent to this email
                  </p>
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number (optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep("select")}>
                  Back
                </Button>
                <Button onClick={handlePurchase} disabled={submitting} className="flex-1">
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    `Complete Purchase - $${totalPrice.toFixed(2)}`
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "confirm" && (
          <Card className="text-center">
            <CardContent className="pt-8 pb-8">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Ticket className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Purchase Complete!</h2>
              <p className="text-muted-foreground mb-6">
                Your ticket(s) have been purchased. Check your email for confirmation.
              </p>

              <div className="space-y-3 max-w-md mx-auto">
                {purchasedCodes.map((code, i) => (
                  <Link
                    key={code}
                    to="/verify/$id"
                    params={{ id: code }}
                    className="block rounded-lg border bg-muted/50 p-4 hover:bg-muted transition"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Ticket #{i + 1}</p>
                        <p className="text-sm text-muted-foreground">{selectedTicketType?.name}</p>
                      </div>
                      <Button variant="secondary" size="sm">
                        View Ticket
                      </Button>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="mt-8 flex gap-4 justify-center">
                <Link to="/">
                  <Button variant="outline">Browse More Events</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
