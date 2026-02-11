import { AsyncPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  TuiButton,
  TuiDialogContext,
  TuiIcon,
  TuiNotification,
} from '@taiga-ui/core';
import {
  type TuiFileLike,
  TuiFileRejectedPipe,
  TuiFiles,
  TuiInputFiles,
  TuiSkeleton,
  TuiSlides,
  TuiStepper,
} from '@taiga-ui/kit';
import { TuiAvatar } from '@taiga-ui/kit';
import { TuiHeader } from '@taiga-ui/layout';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  BehaviorSubject,
  finalize,
  type Observable,
  of,
  startWith,
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
} from '../models';

import { AscentsService } from '../services/ascents.service';
import { EightAnuService } from '../services/eight-anu.service';
import { NotificationService } from '../services/notification.service';
import { SupabaseService } from '../services/supabase.service';
import { ToastService } from '../services/toast.service';
import { GlobalData } from '../services/global-data';

import { slugify } from '../utils';

import { AvatarGradeComponent } from './avatar-grade';

@Component({
  selector: 'app-import-8a',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    FormsModule,
    TuiButton,
    TuiSkeleton,
    TuiHeader,
    TuiStepper,
    TranslatePipe,
    TuiNotification,
    TuiSlides,
    TuiFiles,
    TuiInputFiles,
    TuiFileRejectedPipe,
    AsyncPipe,
    TuiAvatar,
    TuiIcon,
    AvatarGradeComponent,
  ],
  template: `
    <div class="flex justify-center">
      <div class="w-full max-w-2xl">
        <tui-stepper
          [activeItemIndex]="index"
          (activeItemIndexChange)="onStep($event)"
          class="mb-4"
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
              <tui-notification appearance="info" class="mt-4">
                <div [innerHTML]="'import8a.csvInstructions' | translate"></div>
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
                    control.value | tuiFileRejected: { accept: '.csv' } | async;
                    as file
                  ) {
                    <tui-file
                      state="error"
                      [file]="file"
                      (remove)="removeFile()"
                    />
                  }

                  @if (loadedFile(); as file) {
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
          }

          <!-- Step 1: Preview & Confirm -->
          @if (index === 1) {
            <div class="grid gap-4">
              <header tuiHeader>
                <span tuiSubtitle>{{
                  'import8a.confirmSubtitle'
                    | translate: { count: ascents().length }
                }}</span>
              </header>

              <div class="max-h-[35dvh] overflow-auto border rounded p-2">
                @for (
                  ascent of ascents();
                  track ascent.name + ascent.sector_name + ascent.date
                ) {
                  @defer (on viewport) {
                    <div
                      class="p-2 border-b last:border-0 flex justify-between items-center gap-4"
                    >
                      <div class="flex items-center gap-3">
                        <app-avatar-grade
                          [grade]="
                            LABEL_TO_VERTICAL_LIFE[ascent.difficulty] ?? 0
                          "
                        />
                        <div>
                          <div class="font-semibold">
                            {{ ascent.name }}
                          </div>
                          <div class="text-xs opacity-70">
                            {{ ascent.sector_name }} -
                            {{ ascent.date | date }}
                          </div>
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <tui-avatar
                          size="s"
                          class="!text-white"
                          [style.background]="
                            ascentsService.ascentInfo()[
                              ascent.type || 'default'
                            ].background
                          "
                        >
                          <tui-icon
                            [icon]="
                              ascentsService.ascentInfo()[
                                ascent.type || 'default'
                              ].icon
                            "
                          />
                        </tui-avatar>
                      </div>
                    </div>
                  } @placeholder {
                    <div
                      class="p-2 border-b last:border-0 flex justify-between items-center gap-4"
                    >
                      <div class="flex items-center gap-3">
                        <tui-avatar size="m" tuiSkeleton />
                      </div>
                      <div class="flex items-center gap-2">
                        <tui-avatar size="s" tuiSkeleton />
                      </div>
                    </div>
                  }
                }
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
  protected readonly ascentsService = inject(AscentsService);
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
  protected readonly LABEL_TO_VERTICAL_LIFE = LABEL_TO_VERTICAL_LIFE;

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
  protected readonly loadedFile = signal<TuiFileLike | null>(null);

  protected readonly loadedFiles$ = this.control.valueChanges.pipe(
    startWith(this.control.value),
    switchMap((file) => {
      if (!file) {
        this.loadedFile.set(null);
        return of(null);
      }
      return this.processFile(file).pipe(
        tap((processed) => {
          this.loadedFile.set(processed);
        }),
      );
    }),
  );

  constructor() {
    this.loadedFiles$.pipe(takeUntilDestroyed()).subscribe();
  }

  protected removeFile(): void {
    this.control.setValue(null);
    this.ascents.set([]);
    this.loadedFile.set(null);
  }

  protected processFile(
    file: TuiFileLike | null,
  ): Observable<TuiFileLike | null> {
    this.failedFiles$.next(null);

    if (this.control.invalid || !file) {
      return of(null);
    }

    // If we already have ascents loaded and the file is the same name/size, skip processing
    // This avoids reparsing when switching steps
    if (this.ascents().length > 0) {
      return of(file);
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

  async onImport(): Promise<void> {
    const ascents = this.ascents();
    if (ascents.length === 0) return;

    this.importing.set(true);
    const progress$ = new BehaviorSubject<number>(0);
    this.loaderClose$ = this.toast.showLoader('import8a.importing', progress$);

    try {
      console.log('[8a Import] Starting import for', ascents.length, 'ascents');

      // 1. Get all unique names of routes, areas, and crags
      const uniqueAreaNames = [...new Set(ascents.map((a) => a.location_name))];
      console.log('[8a Import] Unique areas:', uniqueAreaNames);

      // 1.1 Get coordinates from 8a.nu for the areas, and also collect cragSlugs (areas in our app)
      const areaToCoords = new Map<
        string,
        { latitude: number; longitude: number }
      >();
      const areaToSlug = new Map<string, string>(); // areaName (CSV) -> 8anu.cragSlug
      const uniqueAreas = [
        ...new Map(
          ascents.map((a) => [a.location_name, a.country_code]),
        ).entries(),
      ];

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

      const totalUnits = uniqueAreas.length + uniqueSectorsToFetch.length + 5;
      let completedUnits = 0;

      const incrementProgress = () => {
        completedUnits++;
        progress$.next(
          Math.min(100, Math.floor((completedUnits / totalUnits) * 100)),
        );
      };

      // 1.1 Parallel fetching for unique areas (limit concurrency to 5)
      const AREA_CONCURRENCY = 5;
      for (let i = 0; i < uniqueAreas.length; i += AREA_CONCURRENCY) {
        const batch = uniqueAreas.slice(i, i + AREA_CONCURRENCY);
        await Promise.all(
          batch.map(async ([areaName]) => {
            try {
              const searchResult = await this.eightAnuService.searchCrag(
                areaName,
                undefined,
              );
              if (searchResult) {
                if (searchResult.coordinates) {
                  areaToCoords.set(areaName, searchResult.coordinates);
                }
                if (searchResult.cragSlug) {
                  areaToSlug.set(areaName, searchResult.cragSlug);
                }
              }
            } catch (e) {
              console.error(`[8a Import] Error searching area ${areaName}:`, e);
            }
            incrementProgress();
          }),
        );
      }

      // 1.2 Fetch all routes for each unique sector
      // OPTIMIZATION: Cache area routes so we only fetch them once per area, even if there are many sectors
      const areaRoutesCache = new Map<string, EightAnuRoute[]>();
      const sectorTo8aRoutes = new Map<
        string,
        { routes: EightAnuRoute[]; climbingKind: ClimbingKind }
      >();
      const sectorToCragSlug = new Map<string, string>(); // areaSlug|sectorSlug -> 8anu.sectorSlug

      const SECTOR_CONCURRENCY = 3; // Lower concurrency for routes as it's heavier
      for (
        let i = 0;
        i < uniqueSectorsToFetch.length;
        i += SECTOR_CONCURRENCY
      ) {
        const batch = uniqueSectorsToFetch.slice(i, i + SECTOR_CONCURRENCY);
        await Promise.all(
          batch.map(async (s) => {
            try {
              const countrySlug = this.eightAnuService.getCountrySlug(
                s.countryCode,
              );
              const area8aSlug =
                areaToSlug.get(s.locationName) || slugify(s.locationName);
              const areaSlug = slugify(s.locationName);
              const sectorSlug = slugify(s.sectorName);

              // 1. Find the real sector slug
              const searchResult = await this.eightAnuService.searchRoute(
                s.locationName,
                s.sectorName,
                undefined,
              );

              if (searchResult) {
                const realSectorSlug = searchResult.sectorSlug;
                const realAreaSlug = searchResult.cragSlug || area8aSlug;

                sectorToCragSlug.set(
                  `${areaSlug}|${sectorSlug}`,
                  realSectorSlug,
                );

                const category =
                  s.climbingKind === ClimbingKinds.BOULDER
                    ? 'bouldering'
                    : 'sportclimbing';

                // 2. Fetch routes (Check cache first to avoid redundant area fetches)
                const cacheKey = `${category}|${countrySlug}|${realAreaSlug}`;
                let allRoutes = areaRoutesCache.get(cacheKey);

                if (!allRoutes) {
                  allRoutes = await this.eightAnuService.getAllRoutes(
                    category,
                    countrySlug,
                    realAreaSlug,
                  );
                  areaRoutesCache.set(cacheKey, allRoutes);
                }

                const sectorRoutes = allRoutes.filter(
                  (r) => r.sectorSlug === realSectorSlug,
                );

                if (sectorRoutes.length > 0) {
                  sectorTo8aRoutes.set(`${areaSlug}|${sectorSlug}`, {
                    routes: sectorRoutes,
                    climbingKind: s.climbingKind,
                  });
                }
              }
            } catch (e) {
              console.error(
                `[8a Import] Error processing sector ${s.sectorName}:`,
                e,
              );
            }
            incrementProgress();
          }),
        );
      }

      // 2. Prepare payload for SQL function
      const payload = ascents.map((a) => {
        const areaSlug = slugify(a.location_name);
        const area8aSlug = areaToSlug.get(a.location_name) || areaSlug;
        const sectorSlug = slugify(a.sector_name);
        const crag8aSlug =
          sectorToCragSlug.get(`${areaSlug}|${sectorSlug}`) || sectorSlug;

        const coords = areaToCoords.get(a.location_name);

        const sectorData = sectorTo8aRoutes.get(`${areaSlug}|${sectorSlug}`);
        const match = sectorData?.routes.find(
          (r) => slugify(r.zlaggableName) === slugify(a.name),
        );

        const routeSlug = match ? match.zlaggableSlug : slugify(a.name);
        const grade = LABEL_TO_VERTICAL_LIFE[a.difficulty] ?? 0;

        return {
          area_name: a.location_name,
          area_slug: areaSlug,
          area_8a_slug: area8aSlug,
          crag_name: a.sector_name,
          crag_slug: sectorSlug,
          crag_8a_slug: crag8aSlug,
          country_code: a.country_code,
          lat: coords?.latitude ?? null,
          lng: coords?.longitude ?? null,
          route_name: a.name,
          route_slug: routeSlug,
          route_8a_slug: match?.zlaggableSlug ?? null,
          grade,
          climbing_kind: a.climbing_kind,
          date: a.date.split('T')[0],
          style: a.type,
          tries: a.tries,
          rating: a.rating === 0 ? null : a.rating,
          comment: a.comment,
          recommended: a.recommended,
        };
      });

      console.log(
        `[8a Import] Prepared ${payload.length} items for import. Sending to Supabase...`,
      );

      // 3. Call RPC in batches
      const CHUNK_SIZE = 50;
      let totalInserted = 0;
      let totalSkipped = 0;
      let totalCreatedAreas = 0;
      let totalCreatedCrags = 0;
      let totalCreatedRoutes = 0;

      for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
        const chunk = payload.slice(i, i + CHUNK_SIZE);
        const { data, error } = await this.supabase.client.rpc(
          'import_8a_ascents',
          {
            ascents: chunk,
          },
        );

        if (error) {
          console.error('[8a Import] RPC Error:', error);
          throw error;
        }

        if (data) {
          totalInserted += data.inserted_ascents ?? 0;
          totalSkipped += data.skipped_ascents ?? 0;
          totalCreatedAreas += data.created_areas ?? 0;
          totalCreatedCrags += data.created_crags ?? 0;
          totalCreatedRoutes += data.created_routes ?? 0;
        }

        completedUnits += chunk.length;
        progress$.next(
          Math.min(100, Math.floor((completedUnits / totalUnits) * 100)),
        );
      }

      // 4. Reload resources
      this.ascentsService.refreshResources();
      this.global.areasListResource.reload();
      this.global.areasMapResource.reload();
      this.global.mapResource.reload();
      this.global.cragsListResource.reload();
      this.global.cragDetailResource.reload();
      this.global.cragRoutesResource.reload();

      // 5. Show success message
      let skippedInfo = '';
      if (totalSkipped > 0) {
        skippedInfo = ` (${this.translate.instant('import8a.skipped', {
          count: `<strong>${totalSkipped}</strong>`,
        })})`;
      }

      let createdInfo = '';
      if (
        totalCreatedAreas > 0 ||
        totalCreatedCrags > 0 ||
        totalCreatedRoutes > 0
      ) {
        createdInfo = '<br>';
        if (totalCreatedAreas > 0) {
          createdInfo += ` <strong>+${totalCreatedAreas}</strong> ${this.translate.instant(totalCreatedAreas === 1 ? 'labels.area' : 'labels.areas').toLowerCase()}`;
        }
        if (totalCreatedCrags > 0) {
          createdInfo += ` <strong>+${totalCreatedCrags}</strong> ${this.translate.instant(totalCreatedCrags === 1 ? 'labels.crag' : 'labels.crags').toLowerCase()}`;
        }
        if (totalCreatedRoutes > 0) {
          createdInfo += ` <strong>+${totalCreatedRoutes}</strong> ${this.translate.instant(totalCreatedRoutes === 1 ? 'labels.route' : 'labels.routes').toLowerCase()}`;
        }
      }

      this.notification.success(
        this.translate.instant('import8a.success', {
          importedCount: `<strong>${totalInserted}</strong>`,
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
    if (t.includes('flash') || t === 'f') return AscentTypes.F;
    return AscentTypes.RP;
  }
}
