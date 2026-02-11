# Instrucciones para actualizar la base de datos Supabase

Para optimizar la importación de datos desde 8a.nu y mover la lógica al backend, es necesario crear una función RPC en la base de datos PostgreSQL de Supabase.

Sigue estos pasos:

1.  Ve al panel de control de tu proyecto en Supabase.
2.  Navega a la sección **SQL Editor** (icono de terminal en la barra lateral).
3.  Crea un **New query**.
4.  Copia y pega el siguiente código SQL:

```sql
-- Primero, creamos un tipo compuesto para la respuesta
-- Esto permite que Supabase genere tipos de TypeScript específicos en lugar de un tipo Json genérico.
DROP TYPE IF EXISTS import_8a_ascents_result CASCADE;
CREATE TYPE import_8a_ascents_result AS (
  inserted_ascents integer,
  skipped_ascents integer,
  created_areas integer,
  created_crags integer,
  created_routes integer
);

create or replace function import_8a_ascents(ascents jsonb)
returns import_8a_ascents_result
language plpgsql
security definer
as $$
declare
  _ascent jsonb;
  _user_id uuid;
  _is_admin boolean;

  -- Stats
  _inserted_ascents int := 0;
  _skipped_ascents int := 0;
  _created_areas int := 0;
  _created_crags int := 0;
  _created_routes int := 0;

  -- Variables
  _area_name text;
  _area_slug text;
  _area_8a_slug text;
  _area_id bigint;

  _crag_name text;
  _crag_slug text;
  _crag_8a_slug text;
  _crag_id bigint;
  _lat float;
  _lng float;

  _route_name text;
  _route_slug text;
  _route_8a_slug text;
  _route_id bigint;
  _grade int;
  _climbing_kind public.climbing_kind;

  _date date;
  _style public.ascent_type;
  _tries int;
  _rating int;
  _comment text;
  _recommended boolean;

begin
  _user_id := auth.uid();
  _is_admin := is_user_admin(_user_id);

  for _ascent in select * from jsonb_array_elements(ascents)
  loop
    -- Extract Area
    _area_name := _ascent->>'area_name';
    _area_slug := _ascent->>'area_slug';
    _area_8a_slug := _ascent->>'area_8a_slug';

    -- Buscar área en base a slugs de 8a o slug local
    select id into _area_id from areas
    where slug = _area_slug
       or (_area_8a_slug is not null and eight_anu_crag_slugs @> array[_area_8a_slug])
    limit 1;

    -- Si no se encuentra, intentar buscar globalmente por slug para evitar errores de unicidad
    if _area_id is null then
      select id into _area_id from areas where slug = _area_slug limit 1;
    end if;

    if _area_id is null then
      if _is_admin then
        insert into areas (name, slug, eight_anu_crag_slugs, user_creator_id)
        values (_area_name, _area_slug, case when _area_8a_slug is not null then array[_area_8a_slug] else null end, _user_id)
        on conflict (slug) do update set
          eight_anu_crag_slugs = case
            when _area_8a_slug is not null and not (areas.eight_anu_crag_slugs @> array[_area_8a_slug])
            then array_append(areas.eight_anu_crag_slugs, _area_8a_slug)
            else areas.eight_anu_crag_slugs
          end
        returning id into _area_id;

        if _area_id is null then
           select id into _area_id from areas where slug = _area_slug;
        else
           _created_areas := _created_areas + 1;
        end if;
      else
        _skipped_ascents := _skipped_ascents + 1;
        continue;
      end if;
    end if;

    -- Extract Crag
    _crag_name := _ascent->>'crag_name';
    _crag_slug := _ascent->>'crag_slug';
    _crag_8a_slug := _ascent->>'crag_8a_slug';
    _lat := (_ascent->>'lat')::float;
    _lng := (_ascent->>'lng')::float;

    -- Buscar sector en el área actual
    select id into _crag_id from crags
    where area_id = _area_id
      and (slug = _crag_slug or (_crag_8a_slug is not null and eight_anu_sector_slugs @> array[_crag_8a_slug]))
    limit 1;

    -- Si no se encuentra, intentar buscar globalmente por slug
    if _crag_id is null then
      select id into _crag_id from crags where slug = _crag_slug limit 1;
    end if;

    if _crag_id is null then
      insert into crags (name, slug, area_id, latitude, longitude, eight_anu_sector_slugs, user_creator_id)
      values (_crag_name, _crag_slug, _area_id, _lat, _lng, case when _crag_8a_slug is not null then array[_crag_8a_slug] else null end, _user_id)
      on conflict (slug) do update set
        eight_anu_sector_slugs = case
          when _crag_8a_slug is not null and not (crags.eight_anu_sector_slugs @> array[_crag_8a_slug])
          then array_append(crags.eight_anu_sector_slugs, _crag_8a_slug)
          else crags.eight_anu_sector_slugs
        end
      returning id into _crag_id;

      if _crag_id is null then
        select id into _crag_id from crags where slug = _crag_slug;
      else
        _created_crags := _created_crags + 1;
      end if;
    end if;

    -- Extract Route
    _route_name := _ascent->>'route_name';
    _route_slug := _ascent->>'route_slug';
    _route_8a_slug := _ascent->>'route_8a_slug';
    _grade := (_ascent->>'grade')::int;
    _climbing_kind := (_ascent->>'climbing_kind')::public.climbing_kind;

    -- Intentamos encontrar la vía por slug o por el slug de 8a.nu
    select id into _route_id from routes
    where crag_id = _crag_id
      and (slug = _route_slug or (_route_8a_slug is not null and eight_anu_route_slugs @> array[_route_8a_slug]))
    limit 1;

    -- Si no está en el sector, buscamos globalmente por slug
    if _route_id is null then
      select id into _route_id from routes where slug = _route_slug limit 1;
    end if;

    if _route_id is null then
      insert into routes (name, slug, crag_id, grade, climbing_kind, eight_anu_route_slugs, user_creator_id)
      values (_route_name, _route_slug, _crag_id, _grade, _climbing_kind, case when _route_8a_slug is not null then array[_route_8a_slug] else null end, _user_id)
      on conflict (slug) do update set
        eight_anu_route_slugs = case
          when _route_8a_slug is not null and not (routes.eight_anu_route_slugs @> array[_route_8a_slug])
          then array_append(routes.eight_anu_route_slugs, _route_8a_slug)
          else routes.eight_anu_route_slugs
        end
      returning id into _route_id;

      if _route_id is null then
        select id into _route_id from routes where slug = _route_slug;
      else
        _created_routes := _created_routes + 1;
      end if;
    end if;

    -- Extract Ascent Data
    _date := (_ascent->>'date')::date;
    _style := (_ascent->>'style')::public.ascent_type;
    _tries := (_ascent->>'tries')::int;
    _rating := (_ascent->>'rating')::int;
    _comment := _ascent->>'comment';
    _recommended := (_ascent->>'recommended')::boolean;

    -- Check if ascent exists
    if not exists (select 1 from route_ascents where user_id = _user_id and route_id = _route_id and date = _date) then
       insert into route_ascents (user_id, route_id, date, type, attempts, rate, comment, recommended, grade)
       values (_user_id, _route_id, _date, _style, _tries, _rating, _comment, _recommended, _grade);
       _inserted_ascents := _inserted_ascents + 1;
    else
       _skipped_ascents := _skipped_ascents + 1;
    end if;

  end loop;

  return (
    _inserted_ascents,
    _skipped_ascents,
    _created_areas,
    _created_crags,
    _created_routes
  )::import_8a_ascents_result;
end;
$$;
```

5.  Haz clic en **Run** para ejecutar la consulta y crear la función.

Una vez creada la función, la aplicación comenzará a utilizarla automáticamente para importar los datos de 8a.nu de manera más eficiente.
