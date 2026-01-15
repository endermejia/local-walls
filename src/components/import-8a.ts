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
  EightAnuAscent,
  GradeLabel,
  LABEL_TO_VERTICAL_LIFE,
} from '../models';
import { AscentsService, SupabaseService, ToastService } from '../services';
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
          (activeItemIndexChange)="onStep($any($event))"
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
                <header tuiHeader>
                  <h2 tuiTitle>
                    {{ 'import8a.searchTitle' | translate }}
                    <span tuiSubtitle>{{
                      'import8a.searchSubtitle' | translate
                    }}</span>
                  </h2>
                </header>

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
                    @for (ascent of ascents(); track ascent.name) {
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

        return {
          name: getVal('name'),
          location_name: getVal('location_name'),
          sector_name: getVal('sector_name'),
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
      const uniqueRouteNames = [...new Set(ascents.map((a) => a.name))];
      const uniqueAreaNames = [...new Set(ascents.map((a) => a.location_name))];

      // 2. Buscar todas las routes existentes en UNA SOLA llamada
      const { data: existingRoutes } = await this.supabase.client
        .from('routes')
        .select(
          'id, name, crag_id, crags!inner(id, name, area_id, areas!inner(id, name))',
        )
        .in('name', uniqueRouteNames);

      // Crear un mapa para búsqueda rápida: key = "routeName|cragName|areaName"
      const routeMap = new Map<string, number>();
      if (existingRoutes) {
        for (const route of existingRoutes) {
          const crag = route.crags as unknown as {
            id: number;
            name: string;
            area_id: number;
            areas: { id: number; name: string };
          };
          const area = crag?.areas;
          const key = `${route.name.toLowerCase()}|${crag?.name?.toLowerCase()}|${area?.name?.toLowerCase()}`;
          routeMap.set(key, route.id);
        }
      }

      const toInsert: RouteAscentInsertDto[] = [];
      const ascentsToCreateRoutes: EightAnuAscent[] = [];

      // 3. Clasificar ascents: los que ya tienen route vs los que necesitan crearla
      for (const a of ascents) {
        const key = `${a.name.toLowerCase()}|${a.sector_name.toLowerCase()}|${a.location_name.toLowerCase()}`;
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
          });
        } else if (isAdmin) {
          // Route no existe y es admin -> necesita crear route
          ascentsToCreateRoutes.push(a);
        }
      }

      // 4. Si es admin, crear areas, crags y routes faltantes
      if (isAdmin && ascentsToCreateRoutes.length > 0) {
        // Obtener areas existentes
        const { data: existingAreas } = await this.supabase.client
          .from('areas')
          .select('id, name')
          .in('name', uniqueAreaNames);

        const areaMap = new Map<string, number>();
        if (existingAreas) {
          for (const area of existingAreas) {
            areaMap.set(area.name.toLowerCase(), area.id);
          }
        }

        // Crear areas faltantes
        const areasToCreate = uniqueAreaNames.filter(
          (name) => !areaMap.has(name.toLowerCase()),
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
            .upsert(areaUpsertData, { onConflict: 'slug' })
            .select('id, name');

          if (newAreas) {
            for (const area of newAreas) {
              areaMap.set(area.name.toLowerCase(), area.id);
            }
          }
        }

        // Obtener crags existentes de las areas relevantes
        const relevantAreaIds = Array.from(areaMap.values());
        const { data: existingCrags } = await this.supabase.client
          .from('crags')
          .select('id, name, area_id')
          .in('area_id', relevantAreaIds);

        const cragMap = new Map<string, number>(); // key = "cragName|areaId"
        if (existingCrags) {
          for (const crag of existingCrags) {
            cragMap.set(`${crag.name.toLowerCase()}|${crag.area_id}`, crag.id);
          }
        }

        // Crear crags faltantes
        const cragsToCreate: { name: string; area_id: number }[] = [];
        for (const a of ascentsToCreateRoutes) {
          const areaId = areaMap.get(a.location_name.toLowerCase());
          if (areaId) {
            const cragKey = `${a.sector_name.toLowerCase()}|${areaId}`;
            if (!cragMap.has(cragKey)) {
              cragsToCreate.push({
                name: a.sector_name,
                area_id: areaId,
              });
            }
          }
        }

        // Eliminar duplicados por slug para evitar "ON CONFLICT DO UPDATE command cannot affect row a second time"
        const cragsUpsertData = Array.from(
          new Map(
            cragsToCreate.map((c) => {
              const slug = slugify(c.name);
              return [slug, { name: c.name, slug, area_id: c.area_id }];
            }),
          ).values(),
        );

        if (cragsUpsertData.length > 0) {
          const { data: newCrags } = await this.supabase.client
            .from('crags')
            .upsert(cragsUpsertData, { onConflict: 'slug' })
            .select('id, name, area_id');

          if (newCrags) {
            for (const crag of newCrags) {
              cragMap.set(
                `${crag.name.toLowerCase()}|${crag.area_id}`,
                crag.id,
              );
            }
          }
        }

        // Crear routes faltantes
        const routesToCreate: {
          name: string;
          crag_id: number;
          grade: number;
        }[] = [];

        for (const a of ascentsToCreateRoutes) {
          const areaId = areaMap.get(a.location_name.toLowerCase());
          if (areaId) {
            const cragId = cragMap.get(
              `${a.sector_name.toLowerCase()}|${areaId}`,
            );
            if (cragId) {
              routesToCreate.push({
                name: a.name,
                crag_id: cragId,
                grade: LABEL_TO_VERTICAL_LIFE[a.difficulty] ?? 0,
              });
            }
          }
        }

        // Eliminar duplicados por slug para evitar "ON CONFLICT DO UPDATE command cannot affect row a second time"
        const routesUpsertData = Array.from(
          new Map(
            routesToCreate.map((r) => {
              const slug = slugify(r.name);
              return [
                slug,
                {
                  name: r.name,
                  slug,
                  crag_id: r.crag_id,
                  climbing_kind: 'sport' as const,
                  grade: r.grade,
                },
              ];
            }),
          ).values(),
        );

        if (routesUpsertData.length > 0) {
          const { data: newRoutes } = await this.supabase.client
            .from('routes')
            .upsert(routesUpsertData, { onConflict: 'slug' })
            .select('id, name, crag_id');

          // Actualizar routeMap con las nuevas routes
          if (newRoutes) {
            for (const route of newRoutes) {
              const cragId = route.crag_id;
              // Encontrar area_id del crag
              const cragEntry = Array.from(cragMap.entries()).find(
                ([, id]) => id === cragId,
              );
              if (cragEntry) {
                const [cragKey] = cragEntry;
                const [cragName, areaId] = cragKey.split('|');
                const areaEntry = Array.from(areaMap.entries()).find(
                  ([, id]) => id === parseInt(areaId, 10),
                );
                if (areaEntry) {
                  const [areaName] = areaEntry;
                  const key = `${route.name.toLowerCase()}|${cragName}|${areaName}`;
                  routeMap.set(key, route.id);
                }
              }
            }
          }

          // Registrar los ascents de las routes recién creadas
          for (const a of ascentsToCreateRoutes) {
            const key = `${a.name.toLowerCase()}|${a.sector_name.toLowerCase()}|${a.location_name.toLowerCase()}`;
            const routeId = routeMap.get(key);

            if (routeId) {
              toInsert.push({
                route_id: routeId,
                user_id: this.supabase.authUserId()!,
                comment: a.comment,
                date: a.date.split('T')[0],
                type: a.type,
                rate: a.rating === 0 ? null : a.rating,
                attempts: a.tries,
                recommended: a.recommended,
              });
            }
          }
        }
      }

      // 5. Evitar duplicados: obtener ascents existentes del usuario para estas rutas
      const routeIds = [...new Set(toInsert.map((i) => i.route_id))];
      const { data: existingUserAscents } = await this.supabase.client
        .from('route_ascents')
        .select('route_id, date')
        .eq('user_id', this.supabase.authUserId()!)
        .in('route_id', routeIds);

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

      this.toast.success(
        this.translate.instant('import8a.success', {
          importedCount: finalToInsert.length,
          matchedCount: toInsert.length,
          totalCount: ascents.length,
          skippedCount, // Asegurarse de que el i18n lo soporte o simplemente se ignore
        }),
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

  private mapType(type: string): 'rp' | 'os' | 'f' {
    const t = type.toLowerCase();
    if (t.includes('os') || t.includes('onsight')) return 'os';
    if (t.includes('flash')) return 'f';
    return 'rp';
  }
}
