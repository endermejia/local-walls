```sql
ALTER TABLE route_ascents RENAME COLUMN private_comment TO private_ascent;
ALTER TABLE route_ascents ALTER COLUMN private_ascent SET DEFAULT false;

DROP POLICY IF EXISTS "auth_can_read" ON "public"."route_ascents";

CREATE POLICY "auth_can_read" ON "public"."route_ascents"
FOR SELECT USING (
  ((auth.uid() = user_id) OR (private_ascent = false AND is_profile_public(user_id) AND NOT has_ascent_blocking(auth.uid(), user_id)))
);
```
