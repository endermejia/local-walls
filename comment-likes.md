# Comment Likes Feature

This file contains the SQL commands required to implement the comment likes functionality.

## 1. Create Table

```sql
create table route_ascent_comment_likes (
  user_id uuid references auth.users not null,
  comment_id bigint references route_ascent_comments on delete cascade not null,
  created_at timestamptz default now(),
  primary key (user_id, comment_id)
);
```

## 2. Enable RLS

```sql
alter table route_ascent_comment_likes enable row level security;
```

## 3. RLS Policies

```sql
-- Public read access
create policy "Public comments are viewable by everyone."
  on route_ascent_comment_likes for select
  using ( true );

-- Authenticated insert own like
create policy "Users can insert their own likes."
  on route_ascent_comment_likes for insert
  with check ( auth.uid() = user_id );

-- Authenticated delete own like
create policy "Users can delete their own likes."
  on route_ascent_comment_likes for delete
  using ( auth.uid() = user_id );
```

## 4. Toggle Like Function (RPC)

```sql
create or replace function toggle_comment_like(p_comment_id bigint)
returns boolean
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_exists boolean;
begin
  -- Check if like exists
  select exists (
    select 1 from route_ascent_comment_likes
    where user_id = v_user_id and comment_id = p_comment_id
  ) into v_exists;

  if v_exists then
    delete from route_ascent_comment_likes
    where user_id = v_user_id and comment_id = p_comment_id;
    return false;
  else
    insert into route_ascent_comment_likes (user_id, comment_id)
    values (v_user_id, p_comment_id);
    return true;
  end if;
end;
$$;
```

## 5. Notifications Trigger

```sql
create or replace function notify_comment_like()
returns trigger
language plpgsql
security definer
as $$
declare
  v_comment_author_id uuid;
  v_route_name text;
  v_ascent_id bigint;
begin
  -- Get comment author and ascent info
  select
    c.user_id,
    r.name,
    c.route_ascent_id
  into
    v_comment_author_id,
    v_route_name,
    v_ascent_id
  from route_ascent_comments c
  join route_ascents ra on c.route_ascent_id = ra.id
  join routes r on ra.route_id = r.id
  where c.id = new.comment_id;

  -- Don't notify if liking own comment
  if v_comment_author_id != new.user_id then
    insert into notifications (user_id, actor_id, type, resource_id, created_at)
    values (v_comment_author_id, new.user_id, 'comment_like', v_ascent_id::text, now());
  end if;

  return new;
end;
$$;

create trigger on_comment_like
after insert on route_ascent_comment_likes
for each row execute function notify_comment_like();
```
