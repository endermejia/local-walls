import { AsyncPipe, DatePipe } from '@angular/common';
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
  TuiDataListComponent,
  TuiDialogContext,
  TuiNotification,
  TuiTitle,
} from '@taiga-ui/core';
import {
  type TuiFileLike,
  TuiFileRejectedPipe,
  TuiFiles,
  TuiInputFiles,
  TuiSlides,
  TuiStepper,
} from '@taiga-ui/kit';
import { TuiCardLarge, TuiHeader } from '@taiga-ui/layout';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  finalize,
  firstValueFrom,
  type Observable,
  of,
  Subject,
  switchMap,
  tap,
} from 'rxjs';

import {
  AscentType,
  AscentTypes,
  ClimbingKind,
  ClimbingKinds,
  EightAnuAscent,
  EightAnuRoute,
  GradeLabel,
  LABEL_TO_VERTICAL_LIFE,
  RouteAscentDto,
  RouteAscentInsertDto,
} from '../models';

import {
  AscentsService,
  EightAnuService,
  NotificationService,
  SupabaseService,
  ToastService,
  GlobalData,
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
  private readonly eightAnuService = inject(EightAnuService);
  private readonly global = inject(GlobalData);
  private readonly ascentsService = inject(AscentsService);
  private readonly toast = inject(ToastService);
  private readonly notification = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly context = inject(
    POLYMORPHEUS_CONTEXT,
  ) as TuiDialogContext<boolean>;

  private readonly COUNTRY_CODE_TO_SLUG: Record<string, string> = {
    ES: 'spain',
    FR: 'france',
    IT: 'italy',
    DE: 'germany',
    US: 'united-states',
    GB: 'united-kingdom',
    AD: 'andorra',
    BE: 'belgium',
    CH: 'switzerland',
    AT: 'austria',
    GR: 'greece',
    PT: 'portugal',
  };

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
    // Split lines respecting quoted fields that may contain newlines
    const lines: string[] = [];
    let currentLine = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          currentLine += '""';
          i++;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          currentLine += char;
        }
      } else if (char === '\n' && !inQuotes) {
        // Line break outside quotes = new line
        if (currentLine.trim().length > 0) {
          lines.push(currentLine);
        }
        currentLine = '';
      } else if (char === '\r') {
        // Skip carriage returns
        continue;
      } else {
        currentLine += char;
      }
    }

    // Push the last line if not empty
    if (currentLine.trim().length > 0) {
      lines.push(currentLine);
    }

    if (lines.length < 2) {
      console.warn('[8a Import] CSV has less than 2 lines');
      return [];
    }

    // Header looks like: "route_boulder","name","location_name","sector_name","area_name","country_code","date","type","sub_type","rating","project","tries","repeats","difficulty","perceived_hardness","comment","height","recommended","sits"
    const headerLine = lines[0].replace(/"/g, '').trim();
    const headers = headerLine.split(',');

    console.log('[8a Import] CSV Headers:', headers);
    console.log('[8a Import] Total lines to process:', lines.length - 1);

    return lines
      .slice(1)
      .filter((line) => line.trim().length > 0)
      .map((line, lineIndex) => {
        // Improved CSV parsing that handles empty fields and quoted values
        const values: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          const nextChar = line[i + 1];

          if (char === '"') {
            if (inQuotes && nextChar === '"') {
              // Escaped quote inside quoted field
              current += '"';
              i++; // Skip next quote
            } else {
              // Toggle quote state
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            // Field separator found outside quotes
            values.push(current);
            current = '';
          } else {
            current += char;
          }
        }
        // Push the last field
        values.push(current);

        const cleanValues = values.map((v) => v.trim());

        if (cleanValues.length < headers.length) {
          console.warn(
            `[8a Import] Line ${lineIndex + 2} has ${cleanValues.length} fields but expected ${headers.length}. Skipping.`,
            line.substring(0, 100),
          );
          return null;
        }

        const getVal = (name: string) => {
          const idx = headers.indexOf(name);
          if (idx === -1) {
            console.warn(`[8a Import] Header "${name}" not found in CSV`);
            return '';
          }
          const value = cleanValues[idx];
          return value === 'null' || value === '' ? '' : value;
        };

        const ratingValue = parseInt(getVal('rating'), 10) || 0;
        const routeBoulder = getVal('route_boulder');
        const name = getVal('name');
        const difficultyRaw = getVal('difficulty');
        const difficulty = difficultyRaw.toLowerCase() as GradeLabel;

        // Skip if essential fields are missing
        if (!routeBoulder || !name || !difficulty) {
          console.warn(
            `[8a Import] Line ${lineIndex + 2} missing essential fields:`,
            { routeBoulder, name, difficulty },
          );
          return null;
        }

        // Validate that difficulty exists in our grade mapping
        const gradeValue = LABEL_TO_VERTICAL_LIFE[difficulty];
        if (gradeValue === undefined) {
          console.warn(
            `[8a Import] Line ${lineIndex + 2}: Unknown difficulty grade "${difficulty}" (original: "${difficultyRaw}") for route "${name}". Skipping.`,
          );
          return null;
        }

        const locationName = getVal('location_name');
        let sectorName = getVal('sector_name');

        // If sector_name is 'Unknown Sector', concatenate with location_name
        if (sectorName === 'Unknown Sector') {
          sectorName = `Unknown Sector ${locationName}`;
        }

        console.log(
          `[8a Import] Line ${lineIndex + 2}: Parsed "${name}" (${difficulty}/${gradeValue}) in ${sectorName}, ${locationName}`,
        );

        return {
          route_boulder: routeBoulder as 'ROUTE' | 'BOULDER',
          name: name,
          location_name: locationName,
          sector_name: sectorName,
          country_code: getVal('country_code'),
          date: getVal('date'),
          type: this.mapType(getVal('type')),
          rating: Math.max(0, Math.min(5, ratingValue)),
          tries: parseInt(getVal('tries'), 10) || 1,
          difficulty: difficulty,
          comment: getVal('comment'),
          recommended: getVal('recommended') === '1',
          climbing_kind:
            routeBoulder === 'BOULDER'
              ? ClimbingKinds.BOULDER
              : ClimbingKinds.SPORT,
        } as EightAnuAscent;
      })
      .filter((a): a is EightAnuAscent => !!a && !!a.name);
  }

  private async fetch8aCoordinates(
    countryCode: string,
    areaName: string,
  ): Promise<{ latitude: number; longitude: number } | null> {
    const countrySlug =
      this.COUNTRY_CODE_TO_SLUG[countryCode.toUpperCase()] ||
      countryCode.toLowerCase();
    const areaSlug = slugify(areaName);
    const url = `/api/8anu/api/unification/outdoor/v1/web/crags/sportclimbing/${countrySlug}/${areaSlug}`;

    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const data = await response.json();
      if (data?.crag?.location?.latitude && data?.crag?.location?.longitude) {
        return {
          latitude: data.crag.location.latitude,
          longitude: data.crag.location.longitude,
        };
      }
    } catch (e) {
      console.error('Error fetching 8a coordinates:', e);
    }
    return null;
  }

  async onImport(): Promise<void> {
    const ascents = this.ascents();
    if (ascents.length === 0) return;

    const isAdmin = this.supabase.userRole() === 'admin';

    this.importing.set(true);
    this.loaderClose$ = this.toast.showLoader('import8a.importing');

    try {
      console.log('[8a Import] Starting import for', ascents.length, 'ascents');
      // 1. Get all unique names of routes, areas, and crags
      const uniqueAreaNames = [...new Set(ascents.map((a) => a.location_name))];
      console.log('[8a Import] Unique areas:', uniqueAreaNames);

      // 1.1 Get coordinates from 8a.nu for the areas
      const areaToCoords = new Map<
        string,
        { latitude: number; longitude: number }
      >();
      const uniqueAreas = [
        ...new Map(
          ascents.map((a) => [a.location_name, a.country_code]),
        ).entries(),
      ];

      for (const [areaName, countryCode] of uniqueAreas) {
        const coords = await this.fetch8aCoordinates(countryCode, areaName);
        if (coords) {
          areaToCoords.set(areaName, coords);
        }
      }

      // 1.2 Fetch all routes for each unique sector mentioned in the import to get correct slugs
      const sectorTo8aRoutes = new Map<string, EightAnuRoute[]>();
      const uniqueSectorsToFetch = [
        ...new Map(
          ascents.map((a) => [
            `${slugify(a.location_name)}|${slugify(a.sector_name)}`,
            {
              locationName: a.location_name,
              sectorName: a.sector_name,
              countryCode: a.country_code,
              climbingKind: a.climbing_kind!,
            },
          ]),
        ).values(),
      ];

      for (const s of uniqueSectorsToFetch) {
        try {
          const countrySlug =
            this.COUNTRY_CODE_TO_SLUG[s.countryCode.toUpperCase()] ||
            s.countryCode.toLowerCase();
          const areaSlug = slugify(s.locationName);
          const sectorSlug = slugify(s.sectorName);
          const category =
            s.climbingKind === ClimbingKinds.BOULDER
              ? 'bouldering'
              : 'sportclimbing';

          const response = await firstValueFrom(
            this.eightAnuService.getRoutes(
              category,
              countrySlug,
              areaSlug,
              sectorSlug,
            ),
          );
          if (response?.items) {
            sectorTo8aRoutes.set(`${areaSlug}|${sectorSlug}`, response.items);
          }
        } catch (e) {
          console.error(
            `[8a Import] Error fetching routes for sector ${s.sectorName}:`,
            e,
          );
        }
      }

      // 2. Search for all existing routes in the entire DB.
      // We search for both the base slug and the "unified" slug (with the sector) to avoid collisions.
      const baseSlugs = [...new Set(ascents.map((a) => slugify(a.name)))];
      const uniqueifiedSlugs = [
        ...new Set(
          ascents.map((a) => `${slugify(a.name)}-${slugify(a.sector_name)}`),
        ),
      ];
      // New: add 8a.nu slugs
      const eightAnuSlugs: string[] = [];
      for (const a of ascents) {
        const areaSlug = slugify(a.location_name);
        const sectorSlug = slugify(a.sector_name);
        const routes = sectorTo8aRoutes.get(`${areaSlug}|${sectorSlug}`);
        const match = routes?.find(
          (r) => slugify(r.zlaggableName) === slugify(a.name),
        );
        if (match) {
          eightAnuSlugs.push(match.zlaggableSlug);
        }
      }

      const allPossibleSlugs = [
        ...new Set([...baseSlugs, ...uniqueifiedSlugs, ...eightAnuSlugs]),
      ];
      console.log('[8a Import] Searching routes for slugs:', allPossibleSlugs);

      const existingRoutes: {
        id: number;
        name: string;
        slug: string;
        crag_id: number;
        climbing_kind: ClimbingKind;
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
            'id, name, slug, crag_id, climbing_kind, crags(id, name, slug, area_id, areas(id, name, slug))',
          )
          .in('slug', chunk);

        if (error) throw error;
        if (data) {
          console.log(
            `[8a Import] Found ${data.length} existing routes in chunk`,
          );
          existingRoutes.push(...data);
        }
      }

      // Create a map for fast lookup based on SLUGS for maximum robustness
      // key = "areaSlug|cragSlug|routeSlug|climbingKind"
      const getAscentKey = (
        routeName: string,
        cragName: string,
        areaName: string,
        climbingKind: ClimbingKind,
      ) =>
        `${slugify(areaName)}|${slugify(cragName)}|${slugify(routeName)}|${climbingKind}`;

      const routeMap = new Map<string, number>();
      if (existingRoutes) {
        for (const r of existingRoutes) {
          const crag = r.crags;
          const area = crag?.areas;
          if (crag && area) {
            const key = getAscentKey(
              r.name,
              crag.name,
              area.name,
              r.climbing_kind,
            );
            routeMap.set(key, r.id);
          }
        }
      }

      console.log(`[8a Import] routeMap initial size: ${routeMap.size}`);

      const toInsert: RouteAscentInsertDto[] = [];
      const ascentsToCreateRoutes: EightAnuAscent[] = [];

      // 3. Classify ascents: those that already have a route vs those that need to create one
      for (const a of ascents) {
        const key = getAscentKey(
          a.name,
          a.sector_name,
          a.location_name,
          a.climbing_kind!,
        );
        const routeId = routeMap.get(key);

        if (routeId) {
          console.log(
            `[8a Import] Found existing route ID ${routeId} for: ${a.name}`,
          );
          // Existing route -> register directly
          const grade = LABEL_TO_VERTICAL_LIFE[a.difficulty] ?? 0;
          toInsert.push({
            route_id: routeId,
            user_id: this.supabase.authUserId()!,
            comment: a.comment,
            date: a.date.split('T')[0],
            type: a.type,
            rate: a.rating === 0 ? null : a.rating,
            attempts: a.tries,
            recommended: a.recommended,
            grade: grade > 0 ? grade : null,
          });
        } else {
          console.log(
            `[8a Import] Route not found, adding to creation list: ${a.name} in ${a.sector_name}`,
          );
          // Route does not exist -> needs to create route (if possible)
          ascentsToCreateRoutes.push(a);
        }
      }
      console.log(
        `[8a Import] classification stats: ${toInsert.length} already exist, ${ascentsToCreateRoutes.length} to create`,
      );

      // 4. Create missing areas, crags, and routes (if permissions allow)
      let createdAreasCount = 0;
      let createdCragsCount = 0;
      let createdRoutesCount = 0;

      if (ascentsToCreateRoutes.length > 0) {
        console.log(
          '[8a Import] Starting creation flow for',
          ascentsToCreateRoutes.length,
          'routes',
        );
        // Get existing areas by slug
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

        // Create missing areas (ONLY if admin)
        const areasToCreate = uniqueAreaNames.filter(
          (name) => !areaMap.has(slugify(name)),
        );

        if (isAdmin && areasToCreate.length > 0) {
          const areaUpsertData = Array.from(
            new Map(
              areasToCreate.map((name) => {
                const slug = slugify(name);
                return [slug, { name, slug }];
              }),
            ).values(),
          );

          const { data: newAreas, error: areaError } =
            await this.supabase.client
              .from('areas')
              .insert(areaUpsertData)
              .select('id, name, slug');

          if (areaError) {
            console.error('[8a Import] Error creating areas:', areaError);
          }

          if (newAreas) {
            createdAreasCount = newAreas.length;
            for (const area of newAreas) {
              areaMap.set(slugify(area.name), area.id);
            }
          }
        }

        // Get existing crags by slug (base and unified with area)
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

        // Create missing routes (Anyone can create a route if the crag exists)
        const routesToCreate: {
          name: string;
          crag_id: number;
          grade: number;
          crag_name: string;
          climbing_kind: ClimbingKind;
          slug?: string;
        }[] = [];

        // Create missing crags (ONLY if admin)
        const cragsToCreate: {
          name: string;
          area_id: number;
          area_name: string;
          country_code: string;
          climbing_kind: ClimbingKind;
        }[] = [];
        for (const a of ascentsToCreateRoutes) {
          const areaId = areaMap.get(slugify(a.location_name));
          if (areaId) {
            const cragKey = `${areaId}|${slugify(a.sector_name)}`;
            const cragId = cragMap.get(cragKey);
            if (!cragId) {
              console.log(
                `[8a Import] Crag not found, adding to creation list: ${a.sector_name} in area ID ${areaId}`,
              );
              cragsToCreate.push({
                name: a.sector_name,
                area_id: areaId,
                area_name: a.location_name,
                country_code: a.country_code,
                climbing_kind: a.climbing_kind!,
              });
              cragMap.set(cragKey, -1); // Avoid duplicating in this batch
            }
          } else {
            console.log(
              `[8a Import] Area ID not found for: ${a.location_name}`,
            );
          }
        }

        if (
          isAdmin &&
          cragsToCreate.filter((c) => c.area_id !== -1).length > 0
        ) {
          // Use Map to deduplicate crags to be created in this batch
          const usedCragSlugs = new Set(existingCrags.map((ec) => ec.slug));
          const cragsUpsertData = cragsToCreate
            .filter((c) => c.area_id !== -1)
            .map((c) => {
              let slug = slugify(c.name);
              // If the slug already exists in DB or in this batch, we make it unique with the area
              if (usedCragSlugs.has(slug)) {
                slug = `${slug}-${slugify(c.area_name)}`;
              }
              // Final safeguard to avoid the DB UNIQUE constraint error
              if (usedCragSlugs.has(slug)) {
                slug = `${slug}-${c.area_id}`;
              }
              usedCragSlugs.add(slug);

              const coords = areaToCoords.get(c.area_name);

              return {
                name: c.name,
                slug,
                area_id: c.area_id,
                latitude: coords?.latitude ?? null,
                longitude: coords?.longitude ?? null,
              };
            });

          if (cragsUpsertData.length > 0) {
            console.log(
              `[8a Import] Inserting ${cragsUpsertData.length} new crags`,
            );
            const { data: newCrags } = await this.supabase.client
              .from('crags')
              .insert(cragsUpsertData)
              .select('id, name, area_id');

            if (newCrags) {
              console.log(
                `[8a Import] Successfully created ${newCrags.length} new crags`,
              );
              createdCragsCount = newCrags.length;
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

              // Fetch all routes from 8a.nu for the newly created crags
              for (const nc of newCrags) {
                const original = cragsToCreate.find(
                  (c) =>
                    c.area_id === nc.area_id &&
                    slugify(c.name) === slugify(nc.name),
                );

                if (original) {
                  try {
                    const areaSlug = slugify(original.area_name);
                    const sectorSlug = slugify(nc.name);
                    const category =
                      original.climbing_kind === ClimbingKinds.BOULDER
                        ? 'bouldering'
                        : 'sportclimbing';

                    console.log(
                      `[8a Import] Fetching all routes for new crag from cache: ${nc.name} (${category})`,
                    );

                    const routes = sectorTo8aRoutes.get(
                      `${areaSlug}|${sectorSlug}`,
                    );

                    if (routes) {
                      console.log(
                        `[8a Import] Found ${routes.length} routes in 8a.nu for ${nc.name}`,
                      );
                      for (const r8a of routes) {
                        const rKey = getAscentKey(
                          r8a.zlaggableName,
                          nc.name,
                          original.area_name,
                          original.climbing_kind,
                        );

                        if (!routeMap.has(rKey)) {
                          const difficulty =
                            r8a.difficulty.toLowerCase() as GradeLabel;
                          const grade = LABEL_TO_VERTICAL_LIFE[difficulty] ?? 3;

                          routesToCreate.push({
                            name: r8a.zlaggableName,
                            crag_id: nc.id,
                            grade,
                            crag_name: nc.name,
                            climbing_kind: original.climbing_kind,
                            slug: r8a.zlaggableSlug,
                          });
                          routeMap.set(rKey, -1);
                        }
                      }
                    }
                  } catch (e) {
                    console.error(
                      `[8a Import] Error fetching routes for crag ${nc.name}:`,
                      e,
                    );
                  }
                }
              }
            } else {
              console.warn(
                '[8a Import] No new crags were returned after insert',
              );
            }
          }
        }

        for (const a of ascentsToCreateRoutes) {
          const areaId = areaMap.get(slugify(a.location_name));
          if (areaId) {
            const cragId = cragMap.get(`${areaId}|${slugify(a.sector_name)}`);
            if (cragId && cragId !== -1) {
              const key = getAscentKey(
                a.name,
                a.sector_name,
                a.location_name,
                a.climbing_kind!,
              );
              const existingRouteId = routeMap.get(key);
              if (!existingRouteId || existingRouteId === -1) {
                // Ensure grade is within valid range for routes table (>= 0)
                // We use the rawGrade from our mapping, allowing lower grades for boulders/easy routes
                const grade = LABEL_TO_VERTICAL_LIFE[a.difficulty] ?? 3;

                const climbing_kind_to_create =
                  a.route_boulder === 'BOULDER'
                    ? ClimbingKinds.BOULDER
                    : ClimbingKinds.SPORT;

                const areaSlug = slugify(a.location_name);
                const sectorSlug = slugify(a.sector_name);
                const r8aRoutes = sectorTo8aRoutes.get(
                  `${areaSlug}|${sectorSlug}`,
                );
                const match = r8aRoutes?.find(
                  (r) => slugify(r.zlaggableName) === slugify(a.name),
                );

                console.log(
                  `[8a Import] Route to create: ${a.name} (${climbing_kind_to_create}) in crag ID ${cragId} with grade ${grade} (original: ${a.difficulty})`,
                );
                routesToCreate.push({
                  name: a.name,
                  crag_id: cragId,
                  grade,
                  crag_name: a.sector_name,
                  climbing_kind: climbing_kind_to_create,
                  slug: match?.zlaggableSlug,
                });
                routeMap.set(key, -1); // Mark as "to be created"
              }
            } else {
              console.log(
                `[8a Import] Cannot create route "${a.name}" because crag "${a.sector_name}" was not found or created (cragId: ${cragId})`,
              );
            }
          }
        }

        if (routesToCreate.length > 0) {
          // Use Map to deduplicate routes to be created in this batch
          const usedRouteSlugs = new Set(existingRoutes.map((er) => er.slug));
          const routesUpsertData = routesToCreate.map((r) => {
            let slug = r.slug || slugify(r.name);
            // If the slug exists in DB or batch, we make it unique with the sector
            if (usedRouteSlugs.has(slug)) {
              slug = `${slug}-${slugify(r.crag_name)}`;
            }
            // Final safeguard
            if (usedRouteSlugs.has(slug)) {
              slug = `${slug}-${r.crag_id}`;
            }
            usedRouteSlugs.add(slug);

            return {
              name: r.name,
              slug,
              crag_id: r.crag_id,
              climbing_kind: r.climbing_kind,
              grade: r.grade,
            };
          });

          if (routesUpsertData.length > 0) {
            console.log(
              `[8a Import] Inserting ${routesUpsertData.length} new routes into Supabase`,
            );
            const { data: newRoutes, error: insertError } =
              await this.supabase.client
                .from('routes')
                .insert(routesUpsertData)
                .select('id, name, crag_id, climbing_kind');

            if (insertError) {
              console.error('[8a Import] Error inserting routes:', insertError);
              throw insertError;
            }

            // Securely update routeMap with the new routes
            if (newRoutes) {
              console.log(
                `[8a Import] Successfully created ${newRoutes.length} new routes`,
              );
              createdRoutesCount = newRoutes.length;
              for (const nr of newRoutes) {
                console.log(
                  `[8a Import] Assigning ID ${nr.id} to created route: ${nr.name} (${nr.climbing_kind}) in crag ID ${nr.crag_id}`,
                );
                // Find all matching ascents to assign the new ID
                ascentsToCreateRoutes.forEach((a) => {
                  const areaId = areaMap.get(slugify(a.location_name));
                  const cragId = cragMap.get(
                    `${areaId}|${slugify(a.sector_name)}`,
                  );

                  const aClimbingKind =
                    a.route_boulder === 'BOULDER'
                      ? ClimbingKinds.BOULDER
                      : ClimbingKinds.SPORT;

                  if (
                    nr.crag_id === cragId &&
                    slugify(nr.name) === slugify(a.name) &&
                    nr.climbing_kind === aClimbingKind
                  ) {
                    const key = getAscentKey(
                      a.name,
                      a.sector_name,
                      a.location_name,
                      aClimbingKind,
                    );
                    routeMap.set(key, nr.id);
                  }
                });
              }
            } else {
              console.warn(
                '[8a Import] No new routes were returned after insert',
              );
            }

            // Register the ascents of the newly created routes (ONLY if the ID is valid)
            let newlyCreatedAscentsCount = 0;
            for (const a of ascentsToCreateRoutes) {
              const aClimbingKind =
                a.route_boulder === 'BOULDER'
                  ? ClimbingKinds.BOULDER
                  : ClimbingKinds.SPORT;
              const key = getAscentKey(
                a.name,
                a.sector_name,
                a.location_name,
                aClimbingKind,
              );
              const routeId = routeMap.get(key);

              if (routeId && routeId > 0) {
                const grade = LABEL_TO_VERTICAL_LIFE[a.difficulty] ?? 0;
                toInsert.push({
                  route_id: routeId,
                  user_id: this.supabase.authUserId()!,
                  comment: a.comment,
                  date: a.date.split('T')[0],
                  type: a.type,
                  rate: a.rating === 0 ? null : a.rating,
                  attempts: a.tries,
                  recommended: a.recommended,
                  grade: grade > 0 ? grade : null,
                });
                newlyCreatedAscentsCount++;
              }
            }
            console.log(
              `[8a Import] Added ${newlyCreatedAscentsCount} ascents for newly created routes`,
            );
          }
        }
      }

      // 5. Avoid duplicates: get existing user ascents for these routes
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

      console.log(
        `[8a Import] Final check: ${toInsert.length} candidates, ${finalToInsert.length} will be inserted (${toInsert.length - finalToInsert.length} duplicates skipped)`,
      );

      // 6. Insert all ascents at once
      if (finalToInsert.length > 0) {
        const { error } = await this.supabase.client
          .from('route_ascents')
          .insert(finalToInsert);

        if (error) throw error;

        this.ascentsService.refreshResources();
        this.global.areasListResource.reload();
        this.global.areasMapResource.reload();
        this.global.mapResource.reload();
        this.global.cragsListResource.reload();
        this.global.cragDetailResource.reload();
        this.global.cragRoutesResource.reload();
      }

      const skippedCount = toInsert.length - finalToInsert.length;

      let skippedInfo = '';
      if (skippedCount > 0) {
        skippedInfo = ` (${this.translate.instant('import8a.skipped', {
          count: `<strong>${skippedCount}</strong>`,
        })})`;
      }

      let createdInfo = '';
      if (
        createdAreasCount > 0 ||
        createdCragsCount > 0 ||
        createdRoutesCount > 0
      ) {
        createdInfo = '<br>';
        if (createdAreasCount > 0) {
          createdInfo += ` <strong>+${createdAreasCount}</strong> ${this.translate.instant(createdAreasCount === 1 ? 'labels.area' : 'labels.areas').toLowerCase()}`;
        }
        if (createdCragsCount > 0) {
          createdInfo += ` <strong>+${createdCragsCount}</strong> ${this.translate.instant(createdCragsCount === 1 ? 'labels.crag' : 'labels.crags').toLowerCase()}`;
        }
        if (createdRoutesCount > 0) {
          createdInfo += ` <strong>+${createdRoutesCount}</strong> ${this.translate.instant(createdRoutesCount === 1 ? 'labels.route' : 'labels.routes').toLowerCase()}`;
        }
      }

      this.notification.success(
        this.translate.instant('import8a.success', {
          importedCount: `<strong>${finalToInsert.length}</strong>`,
          skippedInfo,
          createdInfo,
        }) + '.',
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
