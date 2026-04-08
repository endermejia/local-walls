# Supabase SQL Instructions for Indoor Centers

Run the following commands in the Supabase SQL Editor to create the necessary tables and RLS policies for the indoor centers feature.

```sql
-- 1. Create Indoor Centers Table
CREATE TABLE public.indoor_centers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  location geometry(Point, 4326),
  city text,
  country text,
  contact_info jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Indoor Center Admins Table
CREATE TABLE public.indoor_center_admins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  center_id uuid REFERENCES public.indoor_centers(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'admin',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(center_id, user_id)
);

-- 3. Create Indoor Topos Table
CREATE TABLE public.indoor_topos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  center_id uuid REFERENCES public.indoor_centers(id) ON DELETE CASCADE,
  name text NOT NULL,
  image_url text NOT NULL,
  start_date date,
  end_date date,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Indoor Topo Photos
CREATE TABLE public.indoor_topo_photos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  topo_id uuid REFERENCES public.indoor_topos(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create Indoor Routes Table
CREATE TABLE public.indoor_routes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  center_id uuid REFERENCES public.indoor_centers(id) ON DELETE CASCADE,
  topo_id uuid REFERENCES public.indoor_topos(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL,
  grade integer,
  color text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(center_id, slug)
);

-- 6. Create Indoor Ascents Table
CREATE TABLE public.indoor_ascents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id uuid REFERENCES public.indoor_routes(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  date timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Create Indoor Ascent Comments
CREATE TABLE public.indoor_ascent_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ascent_id uuid REFERENCES public.indoor_ascents(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  comment text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Create Indoor Ascent Likes
CREATE TABLE public.indoor_ascent_likes (
  ascent_id uuid REFERENCES public.indoor_ascents(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (ascent_id, user_id)
);

-- 9. Create Indoor Ascent Comment Likes
CREATE TABLE public.indoor_ascent_comment_likes (
  comment_id uuid REFERENCES public.indoor_ascent_comments(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (comment_id, user_id)
);

-- Row Level Security (RLS)

ALTER TABLE public.indoor_centers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Indoor centers are viewable by everyone" ON public.indoor_centers FOR SELECT USING (true);
CREATE POLICY "Indoor centers are editable by their admins" ON public.indoor_centers FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.indoor_center_admins
    WHERE indoor_center_admins.center_id = indoor_centers.id
    AND indoor_center_admins.user_id = auth.uid()
  )
);

ALTER TABLE public.indoor_center_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins viewable by everyone" ON public.indoor_center_admins FOR SELECT USING (true);
CREATE POLICY "Admins editable by center admins" ON public.indoor_center_admins FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.indoor_center_admins a
    WHERE a.center_id = indoor_center_admins.center_id
    AND a.user_id = auth.uid()
  )
);

ALTER TABLE public.indoor_topos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Topos are viewable by everyone" ON public.indoor_topos FOR SELECT USING (true);
CREATE POLICY "Topos are editable by center admins" ON public.indoor_topos FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.indoor_center_admins
    WHERE indoor_center_admins.center_id = indoor_topos.center_id
    AND indoor_center_admins.user_id = auth.uid()
  )
);

ALTER TABLE public.indoor_topo_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Topo photos are viewable by everyone" ON public.indoor_topo_photos FOR SELECT USING (true);
CREATE POLICY "Topo photos can be created by authenticated users" ON public.indoor_topo_photos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Topo photos can be deleted by their owners or center admins" ON public.indoor_topo_photos FOR DELETE USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.indoor_topos t
    JOIN public.indoor_center_admins a ON a.center_id = t.center_id
    WHERE t.id = indoor_topo_photos.topo_id
    AND a.user_id = auth.uid()
  )
);

ALTER TABLE public.indoor_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Routes are viewable by everyone" ON public.indoor_routes FOR SELECT USING (true);
CREATE POLICY "Routes are editable by center admins" ON public.indoor_routes FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.indoor_center_admins
    WHERE indoor_center_admins.center_id = indoor_routes.center_id
    AND indoor_center_admins.user_id = auth.uid()
  )
);

ALTER TABLE public.indoor_ascents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ascents are viewable by everyone" ON public.indoor_ascents FOR SELECT USING (true);
CREATE POLICY "Ascents are insertable by authenticated users" ON public.indoor_ascents FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Ascents are editable by their owners" ON public.indoor_ascents FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Ascents are deletable by their owners" ON public.indoor_ascents FOR DELETE USING (user_id = auth.uid());

ALTER TABLE public.indoor_ascent_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ascent comments are viewable by everyone" ON public.indoor_ascent_comments FOR SELECT USING (true);
CREATE POLICY "Ascent comments are insertable by authenticated users" ON public.indoor_ascent_comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Ascent comments are editable by their owners" ON public.indoor_ascent_comments FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Ascent comments are deletable by their owners" ON public.indoor_ascent_comments FOR DELETE USING (user_id = auth.uid());

ALTER TABLE public.indoor_ascent_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ascent likes are viewable by everyone" ON public.indoor_ascent_likes FOR SELECT USING (true);
CREATE POLICY "Ascent likes are editable by their owners" ON public.indoor_ascent_likes FOR ALL USING (user_id = auth.uid());

ALTER TABLE public.indoor_ascent_comment_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ascent comment likes are viewable by everyone" ON public.indoor_ascent_comment_likes FOR SELECT USING (true);
CREATE POLICY "Ascent comment likes are editable by their owners" ON public.indoor_ascent_comment_likes FOR ALL USING (user_id = auth.uid());
```
