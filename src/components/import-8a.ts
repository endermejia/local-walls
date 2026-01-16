import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  TuiAppearance,
  TuiButton,
  TuiTitle,
  TuiDataListComponent,
  TuiNotification,
  TuiDialogContext,
} from '@taiga-ui/core';
import {
  TuiStepper,
  TuiSlides,
  TuiFiles,
  type TuiFileLike,
  TuiFileRejectedPipe,
  TuiInputFiles,
} from '@taiga-ui/kit';
import { TuiCardLarge, TuiHeader } from '@taiga-ui/layout';
import { AsyncPipe, DatePipe } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { finalize, type Observable, of, Subject, switchMap, tap } from 'rxjs';
import {
  RouteAscentInsertDto,
  RouteAscentDto,
  EightAnuAscent,
  GradeLabel,
  LABEL_TO_VERTICAL_LIFE,
  AscentType,
  AscentTypes,
} from '../models';
import {
  AscentsService,
  NotificationService,
  SupabaseService,
  ToastService,
} from '../services';
import { slugify } from '../utils';

@Component({
  selector: 'app-import-8a',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    FormsModule,
    TuiAppearance,
    TuiButton,
    TuiHeader,
    TuiStepper,
    TuiTitle,
    TranslatePipe,
    TuiDataListComponent,
    TuiNotification,
    TuiSlides,
    TuiFiles,
    TuiInputFiles,
    TuiCardLarge,
    TuiFileRejectedPipe,
    AsyncPipe,
  ],
  template: `
    <div class="flex justify-center">
      <div class="w-full max-w-2xl">
        <tui-stepper
          [activeItemIndex]="index"
          (activeItemIndexChange)="onStep($event)"
          class="mb-6"
        >
          <button tuiStep>{{ 'import8a.steps.uploadCSV' | translate }}</button>
          <button tuiStep [disabled]="!control.value">
            {{ 'import8a.steps.confirmAscents' | translate }}
          </button>
        </tui-stepper>

        <section [tuiSlides]="direction" class="mt-6">
          <!-- Step 0: Upload CSV -->
          @if (index === 0) {
            <div class="grid gap-4">
              <div tuiCardLarge tuiAppearance="floating">
                <tui-notification appearance="info" class="mt-4">
                  <div
                    [innerHTML]="'import8a.csvInstructions' | translate"
                  ></div>
                </tui-notification>

                <div class="mt-6">
                  @if (!control.value) {
                    <label tuiInputFiles>
                      <input
                        accept=".csv"
                        tuiInputFiles
                        [formControl]="control"
                      />
                    </label>
                  }

                  <tui-files class="mt-2">
                    @if (
                      control.value
                        | tuiFileRejected: { accept: '.csv' }
                        | async;
                      as file
                    ) {
                      <tui-file
                        state="error"
                        [file]="file"
                        (remove)="removeFile()"
                      />
                    }

                    @if (loadedFiles$ | async; as file) {
                      <tui-file [file]="file" (remove)="removeFile()" />
                    }

                    @if (failedFiles$ | async; as file) {
                      <tui-file
                        state="error"
                        [file]="file"
                        (remove)="removeFile()"
                      />
                    }

                    @if (loadingFiles$ | async; as file) {
                      <tui-file
                        state="loading"
                        [file]="file"
                        (remove)="removeFile()"
                      />
                    }
                  </tui-files>
                </div>
              </div>
            </div>
          }

          <!-- Step 1: Preview & Confirm -->
          @if (index === 1) {
            <div class="grid gap-4">
              <div tuiCardLarge tuiAppearance="floating">
                <header tuiHeader>
                  <h2 tuiTitle>
                    {{ 'import8a.confirmTitle' | translate }}
                    <span tuiSubtitle>{{
                      'import8a.confirmSubtitle'
                        | translate: { count: ascents().length }
                    }}</span>
                  </h2>
                </header>

                <div class="max-h-[35dvh] overflow-auto border rounded p-2">
                  <tui-data-list>
                    @for (
                      ascent of ascents();
                      track ascent.name + ascent.sector_name + ascent.date
                    ) {
                      <div
                        class="p-2 border-b flex justify-between items-center"
                      >
                        <div>
                          <div class="font-semibold">
                            {{ ascent.name }} ({{ ascent.difficulty }})
                          </div>
                          <div class="text-xs opacity-70">
                            {{ ascent.sector_name }} - {{ ascent.date | date }}
                          </div>
                        </div>
                        <div class="text-xs italic">{{ ascent.type }}</div>
                      </div>
                    }
                  </tui-data-list>
                </div>

                <div class="mt-4 flex gap-2">
                  <button
                    tuiButton
                    type="button"
                    [disabled]="importing()"
                    (click)="onImport()"
                  >
                    {{ 'actions.import' | translate }}
                  </button>
                </div>
              </div>
            </div>
          }
        </section>

        <footer class="mt-8 flex justify-end gap-2">
          @if (index) {
            <button
              appearance="secondary"
              tuiButton
              type="button"
              (click)="onStep(index - 1)"
            >
              {{ 'actions.back' | translate }}
            </button>
          }
          @if (index === 0) {
            <button
              tuiButton
              type="button"
              [disabled]="!control.value || searching()"
              (click)="onStep(1)"
            >
              {{ 'actions.next' | translate }}
            </button>
          }
        </footer>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Import8aComponent {
  private readonly supabase = inject(SupabaseService);
  private readonly ascentsService = inject(AscentsService);
  private readonly toast = inject(ToastService);
  private readonly notification = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly context = inject(
    POLYMORPHEUS_CONTEXT,
  ) as TuiDialogContext<boolean>;

  protected index = 0;
  protected direction = 0;

  protected searching = signal(false);
  protected importing = signal(false);
  protected ascents = signal<EightAnuAscent[]>([]);

  private loaderClose$?: Subject<void>;

  protected onStep(step: number): void {
    this.direction = step - this.index;
    this.index = step;
  }

  protected readonly control = new FormControl<TuiFileLike | null>(
    null,
    Validators.required,
  );

  protected readonly failedFiles$ = new Subject<TuiFileLike | null>();
  protected readonly loadingFiles$ = new Subject<TuiFileLike | null>();
  protected readonly loadedFiles$ = this.control.valueChanges.pipe(
    switchMap((file) => (file ? this.processFile(file) : of(null))),
  );

  protected removeFile(): void {
    this.control.setValue(null);
    this.ascents.set([]);
  }

  protected processFile(
    file: TuiFileLike | null,
  ): Observable<TuiFileLike | null> {
    this.failedFiles$.next(null);

    if (this.control.invalid || !file) {
      return of(null);
    }

    this.loadingFiles$.next(file);

    return of(file).pipe(
      tap(() => this.searching.set(true)),
      switchMap(async (f) => {
        try {
          if (f instanceof File) {
            const text = await f.text();
            const ascents = this.parseCSV(text);

            if (ascents.length === 0) {
              throw new Error('Empty CSV');
            }

            this.ascents.set(ascents);
            return f;
          }
          return null;
        } catch (e) {
          console.error(e);
          this.failedFiles$.next(f);
          this.toast.error(this.translate.instant('import8a.errors.parseCSV'));
          return null;
        }
      }),
      finalize(() => {
        this.loadingFiles$.next(null);
        this.searching.set(false);
      }),
    );
  }

  private parseCSV(text: string): EightAnuAscent[] {
    const lines = text.split('\n');
    if (lines.length < 2) return [];

    // Header looks like: "route_boulder","name","location_name","sector_name","area_name","country_code","date","type","sub_type","rating","project","tries","repeats","difficulty","perceived_hardness","comment","height","recommended","sits"
    const headerLine = lines[0].replace(/"/g, '').trim();
    const headers = headerLine.split(',');

    return lines
      .slice(1)
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        // Simple regex to split by comma but ignore commas inside quotes
        const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        const cleanValues = values.map((v) =>
          v.replace(/^"|"$/g, '').replace(/""/g, '"').trim(),
        );

        if (cleanValues.length < headers.length) return null;

        const getVal = (name: string) => cleanValues[headers.indexOf(name)];
        const ratingValue = parseInt(getVal('rating'), 10) || 0;

        const locationName = getVal('location_name');
        let sectorName = getVal('sector_name');

        // Si sector_name es 'Unknown Sector', concatenar con location_name
        if (sectorName === 'Unknown Sector') {
          sectorName = `Unknown Sector ${locationName}`;
        }

        return {
          name: getVal('name'),
          location_name: locationName,
          sector_name: sectorName,
          date: getVal('date'),
          type: this.mapType(getVal('type')),
          rating: Math.max(0, Math.min(5, ratingValue)),
          tries: parseInt(getVal('tries'), 10) || 1,
          difficulty: getVal('difficulty') as GradeLabel,
          comment: getVal('comment'),
          recommended: getVal('recommended') === '1',
        } as EightAnuAscent;
      })
      .filter((a): a is EightAnuAscent => !!a && !!a.name);
  }

  async onImport(): Promise<void> {
    const ascents = this.ascents();
    if (ascents.length === 0) return;

    const isAdmin = this.supabase.userRole() === 'admin';

    this.importing.set(true);
    this.loaderClose$ = this.toast.showLoader('import8a.importing');

    try {
      // 1. Obtener todos los nombres únicos de routes, areas y crags
      const uniqueAreaNames = [...new Set(ascents.map((a) => a.location_name))];

      // 2. Buscar todas las routes existentes en toda la DB.
      // Buscamos tanto el slug base como el slug "unificado" (con el sector) para evitar colisiones.
      const baseSlugs = [...new Set(ascents.map((a) => slugify(a.name)))];
      const uniqueifiedSlugs = [
        ...new Set(
          ascents.map((a) => `${slugify(a.name)}-${slugify(a.sector_name)}`),
        ),
      ];
      const allPossibleSlugs = [
        ...new Set([...baseSlugs, ...uniqueifiedSlugs]),
      ];

      const existingRoutes: {
        id: number;
        name: string;
        slug: string;
        crag_id: number;
        crags: {
          id: number;
          name: string;
          slug: string;
          area_id: number;
          areas: {
            id: number;
            name: string;
            slug: string;
          } | null;
        } | null;
      }[] = [];
      const CHUNK_SIZE = 50;

      for (let i = 0; i < allPossibleSlugs.length; i += CHUNK_SIZE) {
        const chunk = allPossibleSlugs.slice(i, i + CHUNK_SIZE);
        const { data, error } = await this.supabase.client
          .from('routes')
          .select(
            'id, name, slug, crag_id, crags(id, name, slug, area_id, areas(id, name, slug))',
          )
          .in('slug', chunk);

        if (error) throw error;
        if (data) existingRoutes.push(...data);
      }

      // Crear un mapa para búsqueda rápida basado en SLUGS para máxima robustez
      // key = "areaSlug|cragSlug|routeSlug"
      const getAscentKey = (
        routeName: string,
        cragName: string,
        areaName: string,
      ) => `${slugify(areaName)}|${slugify(cragName)}|${slugify(routeName)}`;

      const routeMap = new Map<string, number>();
      if (existingRoutes) {
        for (const r of existingRoutes) {
          const crag = r.crags;
          const area = crag?.areas;
          if (crag && area) {
            const key = getAscentKey(r.name, crag.name, area.name);
            routeMap.set(key, r.id);
          }
        }
      }

      const toInsert: RouteAscentInsertDto[] = [];
      const ascentsToCreateRoutes: EightAnuAscent[] = [];

      // 3. Clasificar ascents: los que ya tienen route vs los que necesitan crearla
      for (const a of ascents) {
        const key = getAscentKey(a.name, a.sector_name, a.location_name);
        const routeId = routeMap.get(key);

        if (routeId) {
          // Route existente -> registrar directamente
          toInsert.push({
            route_id: routeId,
            user_id: this.supabase.authUserId()!,
            comment: a.comment,
            date: a.date.split('T')[0],
            type: a.type,
            rate: a.rating === 0 ? null : a.rating,
            attempts: a.tries,
            recommended: a.recommended,
            grade: LABEL_TO_VERTICAL_LIFE[a.difficulty] ?? null,
          });
        } else if (isAdmin) {
          // Route no existe y es admin -> necesita crear route
          ascentsToCreateRoutes.push(a);
        }
      }

      // 4. Si es admin, crear areas, crags y routes faltantes
      if (isAdmin && ascentsToCreateRoutes.length > 0) {
        // Obtener areas existentes por slug
        const uniqueAreaSlugs = uniqueAreaNames.map((n) => slugify(n));
        const existingAreas: { id: number; name: string; slug: string }[] = [];
        for (let i = 0; i < uniqueAreaSlugs.length; i += CHUNK_SIZE) {
          const chunk = uniqueAreaSlugs.slice(i, i + CHUNK_SIZE);
          const { data, error } = await this.supabase.client
            .from('areas')
            .select('id, name, slug')
            .in('slug', chunk);

          if (error) throw error;
          if (data) existingAreas.push(...data);
        }

        const areaMap = new Map<string, number>();
        if (existingAreas) {
          for (const area of existingAreas) {
            areaMap.set(slugify(area.name), area.id);
          }
        }

        // Crear areas faltantes
        const areasToCreate = uniqueAreaNames.filter(
          (name) => !areaMap.has(slugify(name)),
        );

        if (areasToCreate.length > 0) {
          const areaUpsertData = Array.from(
            new Map(
              areasToCreate.map((name) => {
                const slug = slugify(name);
                return [slug, { name, slug }];
              }),
            ).values(),
          );

          const { data: newAreas } = await this.supabase.client
            .from('areas')
            .insert(areaUpsertData)
            .select('id, name, slug');

          if (newAreas) {
            for (const area of newAreas) {
              areaMap.set(slugify(area.name), area.id);
            }
          }
        }

        // Obtener crags existentes por slug (base y unificado con area)
        const baseCragSlugs = [
          ...new Set(ascentsToCreateRoutes.map((a) => slugify(a.sector_name))),
        ];
        const uniqueifiedCragSlugs = [
          ...new Set(
            ascentsToCreateRoutes.map(
              (a) => `${slugify(a.sector_name)}-${slugify(a.location_name)}`,
            ),
          ),
        ];
        const allPossibleCragSlugs = [
          ...new Set([...baseCragSlugs, ...uniqueifiedCragSlugs]),
        ];

        const existingCrags: {
          id: number;
          name: string;
          slug: string;
          area_id: number;
        }[] = [];
        for (let i = 0; i < allPossibleCragSlugs.length; i += CHUNK_SIZE) {
          const chunk = allPossibleCragSlugs.slice(i, i + CHUNK_SIZE);
          const { data, error } = await this.supabase.client
            .from('crags')
            .select('id, name, slug, area_id')
            .in('slug', chunk);

          if (error) throw error;
          if (data) existingCrags.push(...data);
        }

        const cragMap = new Map<string, number>(); // key = "areaId|cragSlug"
        if (existingCrags) {
          for (const crag of existingCrags) {
            cragMap.set(`${crag.area_id}|${slugify(crag.name)}`, crag.id);
          }
        }

        // Crear crags faltantes
        const cragsToCreate: {
          name: string;
          area_id: number;
          area_name: string;
        }[] = [];
        for (const a of ascentsToCreateRoutes) {
          const areaId = areaMap.get(slugify(a.location_name));
          if (areaId) {
            const cragKey = `${areaId}|${slugify(a.sector_name)}`;
            if (!cragMap.has(cragKey)) {
              cragsToCreate.push({
                name: a.sector_name,
                area_id: areaId,
                area_name: a.location_name,
              });
              cragMap.set(cragKey, -1); // Evitar duplicar en esta tanda
            }
          }
        }

        // Usar Map para deduplicar crags a crear en esta tanda
        const usedCragSlugs = new Set(existingCrags.map((ec) => ec.slug));
        const cragsUpsertData = cragsToCreate.map((c) => {
          let slug = slugify(c.name);
          // Si el slug ya existe en DB o en este lote, lo hacemos único con el área
          if (usedCragSlugs.has(slug)) {
            slug = `${slug}-${slugify(c.area_name)}`;
          }
          // Salvaguarda final para evitar el error de restricción UNIQUE de la DB
          if (usedCragSlugs.has(slug)) {
            slug = `${slug}-${c.area_id}`;
          }
          usedCragSlugs.add(slug);
          return { name: c.name, slug, area_id: c.area_id };
        });

        if (cragsUpsertData.length > 0) {
          // Se usa insert simple porque ya hemos filtrado lo existente.
          // Si el slug ya existe, fallará, lo cual es correcto.
          const { data: newCrags } = await this.supabase.client
            .from('crags')
            .insert(cragsUpsertData)
            .select('id, name, area_id');

          if (newCrags) {
            for (const a of ascentsToCreateRoutes) {
              const areaId = areaMap.get(slugify(a.location_name));
              const key = `${areaId}|${slugify(a.sector_name)}`;
              const created = newCrags.find(
                (nc) =>
                  nc.area_id === areaId &&
                  slugify(nc.name) === slugify(a.sector_name),
              );
              if (created) cragMap.set(key, created.id);
            }
          }
        }

        // Crear routes faltantes
        const routesToCreate: {
          name: string;
          crag_id: number;
          grade: number;
          crag_name: string;
        }[] = [];

        for (const a of ascentsToCreateRoutes) {
          const areaId = areaMap.get(slugify(a.location_name));
          if (areaId) {
            const cragId = cragMap.get(`${areaId}|${slugify(a.sector_name)}`);
            if (cragId && cragId !== -1) {
              const key = getAscentKey(a.name, a.sector_name, a.location_name);
              if (!routeMap.has(key)) {
                routesToCreate.push({
                  name: a.name,
                  crag_id: cragId,
                  grade: LABEL_TO_VERTICAL_LIFE[a.difficulty] ?? 0,
                  crag_name: a.sector_name,
                });
                routeMap.set(key, -1); // Evitar duplicar en esta tanda
              }
            }
          }
        }

        // Usar Map para deduplicar routes a crear en esta tanda
        const usedRouteSlugs = new Set(existingRoutes.map((er) => er.slug));
        const routesUpsertData = routesToCreate.map((r) => {
          let slug = slugify(r.name);
          // Si el slug existe en DB o lote, lo hacemos único con el sector
          if (usedRouteSlugs.has(slug)) {
            slug = `${slug}-${slugify(r.crag_name)}`;
          }
          // Salvaguarda final
          if (usedRouteSlugs.has(slug)) {
            slug = `${slug}-${r.crag_id}`;
          }
          usedRouteSlugs.add(slug);

          return {
            name: r.name,
            slug,
            crag_id: r.crag_id,
            climbing_kind: 'sport' as const,
            grade: r.grade,
          };
        });

        if (routesUpsertData.length > 0) {
          const { data: newRoutes } = await this.supabase.client
            .from('routes')
            .insert(routesUpsertData)
            .select('id, name, crag_id');

          // Actualizar routeMap con las nuevas routes de forma segura
          if (newRoutes) {
            for (const a of ascentsToCreateRoutes) {
              const areaId = areaMap.get(slugify(a.location_name));
              const cragId = cragMap.get(`${areaId}|${slugify(a.sector_name)}`);

              const createdRoute = newRoutes.find(
                (nr) =>
                  nr.crag_id === cragId && slugify(nr.name) === slugify(a.name),
              );

              if (createdRoute) {
                const key = getAscentKey(
                  a.name,
                  a.sector_name,
                  a.location_name,
                );
                routeMap.set(key, createdRoute.id);
              }
            }
          }

          // Registrar los ascents de las routes recién creadas (SOLO si el ID es válido)
          for (const a of ascentsToCreateRoutes) {
            const key = getAscentKey(a.name, a.sector_name, a.location_name);
            const routeId = routeMap.get(key);

            if (routeId && routeId > 0) {
              toInsert.push({
                route_id: routeId,
                user_id: this.supabase.authUserId()!,
                comment: a.comment,
                date: a.date.split('T')[0],
                type: a.type,
                rate: a.rating === 0 ? null : a.rating,
                attempts: a.tries,
                recommended: a.recommended,
                grade: LABEL_TO_VERTICAL_LIFE[a.difficulty] ?? null,
              });
            }
          }
        }
      }

      // 5. Evitar duplicados: obtener ascents existentes del usuario para estas rutas
      const routeIds = [...new Set(toInsert.map((i) => i.route_id))];
      const existingUserAscents: Pick<RouteAscentDto, 'route_id' | 'date'>[] =
        [];
      for (let i = 0; i < routeIds.length; i += CHUNK_SIZE) {
        const chunk = routeIds.slice(i, i + CHUNK_SIZE);
        const { data, error } = await this.supabase.client
          .from('route_ascents')
          .select('route_id, date')
          .eq('user_id', this.supabase.authUserId()!)
          .in('route_id', chunk);

        if (error) throw error;
        if (data) existingUserAscents.push(...data);
      }

      const existingAscentKeys = new Set(
        existingUserAscents?.map((a) => `${a.route_id}|${a.date}`),
      );

      const finalToInsert = toInsert.filter(
        (i) => !existingAscentKeys.has(`${i.route_id}|${i.date}`),
      );

      // 6. Insertar todos los ascents de una vez
      if (finalToInsert.length > 0) {
        const { error } = await this.supabase.client
          .from('route_ascents')
          .insert(finalToInsert);

        if (error) throw error;

        this.ascentsService.refreshResources();
      }

      const skippedCount = toInsert.length - finalToInsert.length;

      this.notification.success(
        this.translate.instant('import8a.success', {
          importedCount: finalToInsert.length,
          matchedCount: toInsert.length,
          totalCount: ascents.length,
          skippedCount,
        }),
        'import8a.successTitle',
        false,
      );
      this.context.completeWith(true);
    } catch (e) {
      console.error(e);
      this.toast.error(this.translate.instant('import8a.errors.import'));
    } finally {
      this.importing.set(false);
      if (this.loaderClose$) {
        this.loaderClose$.next();
        this.loaderClose$.complete();
      }
    }
  }

  private mapType(type: string): AscentType {
    const t = type.toLowerCase();
    if (t.includes('os') || t.includes('onsight')) return AscentTypes.OS;
    if (t.includes('flash')) return AscentTypes.F;
    return AscentTypes.RP;
  }
}
