# SQL Instructions

Run the following commands in your Supabase SQL Editor to update the database schema safely.
This adds the `first_steps` column, initializes it to `false` for existing users (so they don't see the onboarding), and sets the default to `true` for future users.

```sql
-- 1. Add the column without default first (nullable)
alter table user_profiles add column first_steps boolean;

-- 2. Set existing records to false
update user_profiles set first_steps = false;

-- 3. Set the default to true for new records
alter table user_profiles alter column first_steps set default true;
```
