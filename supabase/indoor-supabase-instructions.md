# Indoor Supabase Setup Instructions

These SQL commands set up the necessary tables, columns, and storage buckets for the Indoor Center functionality in ClimBeast.

## 1. Modify existing tables

```sql
-- Add fields to indoor_centers
ALTER TABLE public.indoor_centers
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS gallery_urls TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS schedules JSONB;

-- Add legacy tags to routes and topos
ALTER TABLE public.indoor_routes
ADD COLUMN IF NOT EXISTS is_legacy BOOLEAN DEFAULT false;

ALTER TABLE public.indoor_topos
ADD COLUMN IF NOT EXISTS is_legacy BOOLEAN DEFAULT false;
```

## 2. Create new tables

```sql
-- indoor_vouchers
CREATE TABLE IF NOT EXISTS public.indoor_vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    center_id UUID NOT NULL REFERENCES public.indoor_centers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    sessions_count INTEGER,
    duration_days INTEGER,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- indoor_voucher_purchases
CREATE TABLE IF NOT EXISTS public.indoor_voucher_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    voucher_id UUID NOT NULL REFERENCES public.indoor_vouchers(id) ON DELETE CASCADE,
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    expiration_date TIMESTAMP WITH TIME ZONE,
    remaining_sessions INTEGER,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'exhausted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- indoor_voucher_usage
CREATE TABLE IF NOT EXISTS public.indoor_voucher_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID NOT NULL REFERENCES public.indoor_voucher_purchases(id) ON DELETE CASCADE,
    usage_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- indoor_sales
CREATE TABLE IF NOT EXISTS public.indoor_sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    center_id UUID NOT NULL REFERENCES public.indoor_centers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    category TEXT,
    payment_method TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- indoor_inventory
CREATE TABLE IF NOT EXISTS public.indoor_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    center_id UUID NOT NULL REFERENCES public.indoor_centers(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    price NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

## 3. Storage Buckets

```sql
-- Create buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('indoor-centers', 'indoor-centers', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('indoor-assets', 'indoor-assets', true)
ON CONFLICT (id) DO NOTHING;
```

## 4. Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE public.indoor_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indoor_voucher_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indoor_voucher_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indoor_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indoor_inventory ENABLE ROW LEVEL SECURITY;

-- indoor_vouchers
CREATE POLICY "Vouchers are viewable by everyone."
ON public.indoor_vouchers FOR SELECT USING (true);

CREATE POLICY "Center admins can insert/update vouchers."
ON public.indoor_vouchers FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.indoor_center_admins
        WHERE indoor_center_admins.center_id = indoor_vouchers.center_id
        AND indoor_center_admins.user_id = auth.uid()
    )
);

-- indoor_voucher_purchases
CREATE POLICY "Users can view their own purchases."
ON public.indoor_voucher_purchases FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Center admins can view and manage purchases for their center."
ON public.indoor_voucher_purchases FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.indoor_vouchers v
        JOIN public.indoor_center_admins a ON a.center_id = v.center_id
        WHERE v.id = indoor_voucher_purchases.voucher_id
        AND a.user_id = auth.uid()
    )
);

-- indoor_voucher_usage
CREATE POLICY "Users can view their own usage."
ON public.indoor_voucher_usage FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.indoor_voucher_purchases p
        WHERE p.id = indoor_voucher_usage.purchase_id
        AND p.user_id = auth.uid()
    )
);

CREATE POLICY "Center admins can insert/view usage for their center."
ON public.indoor_voucher_usage FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.indoor_voucher_purchases p
        JOIN public.indoor_vouchers v ON v.id = p.voucher_id
        JOIN public.indoor_center_admins a ON a.center_id = v.center_id
        WHERE p.id = indoor_voucher_usage.purchase_id
        AND a.user_id = auth.uid()
    )
);

-- indoor_sales
CREATE POLICY "Center admins can manage sales."
ON public.indoor_sales FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.indoor_center_admins
        WHERE indoor_center_admins.center_id = indoor_sales.center_id
        AND indoor_center_admins.user_id = auth.uid()
    )
);

-- indoor_inventory
CREATE POLICY "Center admins can manage inventory."
ON public.indoor_inventory FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.indoor_center_admins
        WHERE indoor_center_admins.center_id = indoor_inventory.center_id
        AND indoor_center_admins.user_id = auth.uid()
    )
);
```
