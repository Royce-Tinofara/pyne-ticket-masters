/*
# Add Ticket Buyer Information

This migration adds buyer information columns to the tickets table,
enabling ticket purchases by non-authenticated users.

## Changes

1. New Columns on `tickets`:
   - `buyer_name` (TEXT) - Name of the ticket buyer
   - `buyer_email` (TEXT) - Email of the ticket buyer
   - `buyer_phone` (TEXT) - Phone number of the ticket buyer
   - `ticket_type` (TEXT) - Type/category of ticket (e.g., "General Admission", "VIP")
   - `price` (DECIMAL) - Price paid for the ticket

2. Security Updates:
   - Update INSERT policy to allow anonymous users to purchase tickets
   - Add policy for public to insert tickets (for purchases)
   - Keep SELECT policy as-is (public can view by verification code)

3. New Table: `ticket_types`
   - Define ticket categories per event (e.g., VIP, General, Student)
   - Price and quantity limits per type
*/

-- Add buyer info columns to tickets
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS buyer_name TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS buyer_email TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS buyer_phone TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS ticket_type TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS price DECIMAL(10,2);

-- Create index for buyer email lookups
CREATE INDEX IF NOT EXISTS idx_tickets_buyer_email ON public.tickets(buyer_email);

-- Ticket Types table for defining ticket categories per event
CREATE TABLE IF NOT EXISTS public.ticket_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  quantity_total INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, name)
);

CREATE INDEX IF NOT EXISTS idx_ticket_types_event ON public.ticket_types(event_id);

ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;

-- Anyone can view ticket types (for the public shop)
DROP POLICY IF EXISTS "public read ticket_types" ON public.ticket_types;
CREATE POLICY "public read ticket_types" ON public.ticket_types
  FOR SELECT USING (true);

-- Only admins can manage ticket types
DROP POLICY IF EXISTS "admins manage ticket_types" ON public.ticket_types;
CREATE POLICY "admins manage ticket_types" ON public.ticket_types
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.ticket_types TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ticket_types TO authenticated;
GRANT ALL ON public.ticket_types TO service_role;

-- Update tickets INSERT policy to allow public purchases
DROP POLICY IF EXISTS "public buy tickets" ON public.tickets;
CREATE POLICY "public buy tickets" ON public.tickets
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (buyer_email IS NOT NULL AND buyer_name IS NOT NULL);

-- Add a ticket_type_id foreign key (nullable, for purchased tickets)
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS ticket_type_id UUID REFERENCES public.ticket_types(id) ON DELETE SET NULL;