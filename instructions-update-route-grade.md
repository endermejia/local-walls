# Instrucciones para actualizar el grado de la vía automáticamente (Supabase)

Para actualizar el grado de una vía (`routes`) basándose en la mediana de los encadenes (`route_ascents`) cada vez que se añade, modifica o elimina un encadene, lo más recomendable es utilizar un **Trigger** en la base de datos.

Esta solución tiene las siguientes ventajas:
1.  **Seguridad**: La función se ejecuta con permisos de administrador (`SECURITY DEFINER`), permitiendo que usuarios estándar actualicen la tabla `routes` indirectamente, aunque no tengan permiso directo de `UPDATE` sobre ella.
2.  **Integridad**: El grado se recalcula automáticamente sin importar desde dónde se añada el encadene (App, API, Dashboard).
3.  **Simplicidad**: No requiere cambios en el código frontend ni en los servicios existentes (`AscentsService`).

## Pasos

Ejecuta los siguientes comandos SQL en el **SQL Editor** de tu proyecto Supabase:

### 1. Crear la función de actualización

Esta función calcula la mediana y actualiza la vía correspondiente.

```sql
CREATE OR REPLACE FUNCTION update_route_grade_median()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Permite ejecutar la función con privilegios de admin (bypass RLS)
AS $$
DECLARE
    _route_id bigint;
    _ascent_count int;
    _new_grade int;
    _route_ids bigint[];
    _rid bigint;
BEGIN
    -- Determinar qué route_id(s) necesitan actualizarse
    IF TG_OP = 'INSERT' THEN
        _route_ids := ARRAY[NEW.route_id];
    ELSIF TG_OP = 'DELETE' THEN
        _route_ids := ARRAY[OLD.route_id];
    ELSE -- UPDATE
        IF OLD.route_id = NEW.route_id THEN
            _route_ids := ARRAY[NEW.route_id];
        ELSE
            _route_ids := ARRAY[OLD.route_id, NEW.route_id];
        END IF;
    END IF;

    -- Iterar sobre los route_ids afectados (usualmente uno)
    FOREACH _rid IN ARRAY _route_ids LOOP
        -- Contar encadenes totales para esta vía
        SELECT count(*) INTO _ascent_count
        FROM route_ascents
        WHERE route_id = _rid;

        -- Solo actualizar si hay más de 3 encadenes
        IF _ascent_count > 3 THEN
            -- Calcular la mediana (PERCENTILE_DISC devuelve un valor existente del conjunto)
            -- Usamos PERCENTILE_DISC(0.5) para obtener la mediana discreta.
            SELECT PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY grade)
            INTO _new_grade
            FROM route_ascents
            WHERE route_id = _rid
              AND grade IS NOT NULL;

            -- Actualizar la vía con el nuevo grado
            IF _new_grade IS NOT NULL THEN
                UPDATE routes
                SET grade = _new_grade
                WHERE id = _rid;
            END IF;
        END IF;
    END LOOP;

    RETURN NULL; -- El valor de retorno se ignora en triggers AFTER
END;
$$;
```

### 2. Crear el Trigger

Este trigger ejecutará la función automáticamente después de cualquier cambio en `route_ascents`.

```sql
-- Eliminar el trigger si ya existe para evitar conflictos
DROP TRIGGER IF EXISTS tr_update_route_grade_median ON route_ascents;

CREATE TRIGGER tr_update_route_grade_median
AFTER INSERT OR UPDATE OF grade, route_id OR DELETE
ON route_ascents
FOR EACH ROW
EXECUTE FUNCTION update_route_grade_median();
```

---

**Nota:**
-   La función usa `PERCENTILE_DISC(0.5)` para calcular la mediana. Esto asegura que el resultado sea siempre un ID de grado válido existente en los encadenes, evitando problemas con decimales o grados inexistentes.
-   La cláusula `SECURITY DEFINER` es crucial para que usuarios sin rol de admin puedan "provocar" la actualización de `routes` al insertar sus encadenes.
