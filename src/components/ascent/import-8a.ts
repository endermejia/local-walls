import { AsyncPipe, DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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

import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { TuiAvatar } from '@taiga-ui/kit';
import { TuiHeader, TuiSlides } from '@taiga-ui/layout';
import {
  TuiButton,
  TuiDialogContext,
  TuiIcon,
  TuiNotification,
  TuiCheckbox,
} from '@taiga-ui/core';
import {
  type TuiFileLike,
  TuiFileRejectedPipe,
  TuiFiles,
  TuiInputFiles,
  TuiSkeleton,
  TuiStepper,
} from '@taiga-ui/kit';

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

import { AscentsService } from '../../services/ascents.service';
import { EightAnuService } from '../../services/eight-anu.service';
import { GlobalData } from '../../services/global-data';
import { NotificationService } from '../../services/notification.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

import { SanitizeHtmlPipe } from '../../pipes/sanitize-html.pipe';
import { GradeComponent } from '../ui/avatar-grade';

import { Json } from '../../models/supabase-generated';
import {
  AscentType,
  AscentTypes,
  ClimbingKind,
  ClimbingKinds,
  EightAnuAscent,
  EightAnuRoute,
  GradeLabel,
  LABEL_TO_VERTICAL_LIFE,
} from '../../models';

import { slugify } from '../../utils';

class EmptyCsvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmptyCsvError';
  }
}

interface Import8aPayload {
  area_name: string;
  area_slug: string;
  area_8a_slug: string;
  crag_name: string;
  crag_slug: string;
  crag_8a_slug: string;
  country_code: string;
  lat: number | null;
  lng: number | null;
  route_name: string;
  route_slug: string;
  route_8a_slug: string | null;
  eight_anu_route_slugs: string[];
  grade: number;
  climbing_kind: ClimbingKind;
  date: string;
  style: AscentType;
  attempts: number | null;
  rating: number | null;
  comment: string;
  recommended: boolean;
}

interface ExistingUserAscentKey {
  date: string | null;
  route:
    | {
        slug: string;
        name: string;
        eight_anu_route_slugs: string[] | null;
        crag: {
          slug: string;
          area: {
            slug: string;
          };
        };
      }
    | {
        slug: string;
        name: string;
        eight_anu_route_slugs: string[] | null;
        crag: {
          slug: string;
          area: {
            slug: string;
          };
        };
      }[];
}

@Component({
  selector: 'app-import-8a',
  imports: [
    SanitizeHtmlPipe,
    AsyncPipe,
    DatePipe,
    FormsModule,
    GradeComponent,
    ReactiveFormsModule,
    TranslatePipe,
    TuiAvatar,
    TuiButton,
    TuiFileRejectedPipe,
    TuiFiles,
    TuiHeader,
    TuiIcon,
    TuiInputFiles,
    TuiNotification,
    TuiSkeleton,
    TuiSlides,
    TuiStepper,
    TuiCheckbox,
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
              <div tuiNotification appearance="info" class="mt-4">
                <div
                  [innerHTML]="
                    'import8a.csvInstructions' | translate | sanitizeHtml
                  "
                ></div>
              </div>

              <div class="mt-6">
                @if (!control.value) {
                  <label tuiInputFiles>
                    <input
                      accept=".csv"
                      tuiInputFiles
                      [formControl]="control"
                      autocomplete="off"
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
              <header tuiHeader class="flex justify-between items-center">
                <span tuiSubtitle
                  >{{
                    'import8a.confirmSubtitle'
                      | translate: { count: ascents().length }
                  }}
                </span>
                <span class="text-xs font-semibold opacity-70"
                  >{{ selectedIndices().size }} / {{ ascents().length }}
                  {{ 'selected' | translate }}</span
                >
                <label
                  class="text-xs opacity-60 flex items-center gap-1.5 select-none hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <input
                    tuiCheckbox
                    type="checkbox"
                    [ngModel]="
                      selectedIndices().size === ascents().length &&
                      ascents().length > 0
                    "
                    (ngModelChange)="toggleAll($event)"
                  />
                  <span>{{ 'selectAll' | translate }}</span>
                </label>
              </header>

              <div class="max-h-[35dvh] overflow-auto border rounded p-2">
                @for (
                  ascent of ascents();
                  track ascent.name + ascent.sector_name + ascent.date;
                  let idx = $index
                ) {
                  @defer (on viewport) {
                    <div
                      class="p-2 border-b last:border-0 flex justify-between items-center gap-4 transition-all duration-150"
                      [class.opacity-40]="!isSelected(idx)"
                    >
                      <div class="flex items-center gap-3">
                        <label class="flex items-center gap-2 cursor-pointer">
                          <input
                            tuiCheckbox
                            type="checkbox"
                            [ngModel]="isSelected(idx)"
                            (ngModelChange)="toggleSelect(idx, $event)"
                          />
                        </label>
                        <app-grade
                          [grade]="
                            this.LABEL_TO_VERTICAL_LIFE[ascent.difficulty] ?? 0
                          "
                          [kind]="ascent.climbing_kind"
                        />
                        <div>
                          <div class="font-semibold">
                            {{ ascent.name }}
                          </div>
                          <div class="text-xs opacity-70">
                            {{ ascent.sector_name }} -
                            {{ ascent.date | date }}
                          </div>
                          @if (getResolvedData(ascent); as data) {
                            <div class="text-[10px] opacity-50 flex gap-2">
                              <span>slug: {{ data.slug }}</span>
                              @for (
                                slug8a of data.eightAnuSlugs;
                                track slug8a
                              ) {
                                <span>8a: {{ slug8a }}</span>
                              }
                            </div>
                          }
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <span
                          tuiAvatar
                          size="s"
                          class="text-(--tui-text-primary-on-accent-1)!"
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
                        </span>
                      </div>
                    </div>
                  } @placeholder {
                    <div
                      class="p-2 border-b last:border-0 flex justify-between items-center gap-4"
                    >
                      <div class="flex items-center gap-3">
                        <span tuiAvatar size="m" tuiSkeleton></span>
                      </div>
                      <div class="flex items-center gap-2">
                        <span tuiAvatar size="s" tuiSkeleton></span>
                      </div>
                    </div>
                  }
                }
              </div>

              <div class="mt-4 flex gap-2">
                <button
                  tuiButton
                  type="button"
                  [disabled]="importing() || ascents().length === 0"
                  (click)="onImport()"
                >
                  {{ 'import' | translate }}
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
              {{ 'back' | translate }}
            </button>
          }
          @if (index === 0) {
            <button
              tuiButton
              type="button"
              [disabled]="!control.value || searching()"
              (click)="onStep(1)"
            >
              {{ 'next' | translate }}
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
  protected selectedIndices = signal<Set<number>>(new Set());

  protected toggleSelect(index: number, checked: boolean): void {
    this.selectedIndices.update((set) => {
      const newSet = new Set(set);
      if (checked) {
        newSet.add(index);
      } else {
        newSet.delete(index);
      }
      return newSet;
    });
  }

  protected isSelected(index: number): boolean {
    return this.selectedIndices().has(index);
  }

  protected toggleAll(checked: boolean): void {
    const current = this.ascents();
    if (checked) {
      this.selectedIndices.set(new Set(current.map((_, i) => i)));
    } else {
      this.selectedIndices.set(new Set());
    }
  }
  protected readonly LABEL_TO_VERTICAL_LIFE = LABEL_TO_VERTICAL_LIFE;

  private loaderClose$?: Subject<void>;
  private existingAscentKeysCache: Set<string> | null = null;
  private existingAscentKeysCacheRange: { from: string; to: string } | null =
    null;

  private readonly resolvedSlugsMap = new Map<
    string,
    { slug: string; eightAnuSlugs: string[] }
  >();

  protected getResolvedData(
    ascent: EightAnuAscent,
  ): { slug: string; eightAnuSlugs: string[] } | undefined {
    const key = `${slugify(ascent.location_name)}|${slugify(ascent.sector_name)}|${slugify(ascent.name)}`;
    return this.resolvedSlugsMap.get(key);
  }

  protected async onStep(step: number): Promise<void> {
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
    this.selectedIndices.set(new Set());
    this.loadedFile.set(null);
    this.existingAscentKeysCache = null;
    this.existingAscentKeysCacheRange = null;
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
            const parsedAscents = this.parseCSV(text);

            if (parsedAscents.length === 0) {
              throw new EmptyCsvError('Empty CSV');
            }

            await this.resolveCsvAscentsWith8aData(parsedAscents);
            const { ascents } =
              await this.deduplicateCsvAscentsAgainstExisting(parsedAscents);

            this.ascents.set(ascents);
            this.selectedIndices.set(new Set(ascents.map((_, i) => i)));
            return f;
          }
          return null;
        } catch (e) {
          console.error(e);
          this.failedFiles$.next(f);
          if (e instanceof EmptyCsvError) {
            this.toast.error(
              this.translate.instant('import8a.errors.emptyCSV'),
            );
          } else {
            this.toast.error(
              this.translate.instant('import8a.errors.parseCSV'),
            );
          }
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

        const triesStr = getVal('tries');

        return {
          route_boulder: routeBoulder as 'ROUTE' | 'BOULDER',
          name: name,
          location_name: locationName,
          sector_name: sectorName,
          country_code: getVal('country_code'),
          date: getVal('date'),
          type: this.mapType(getVal('type')),
          rating: Math.max(0, Math.min(5, ratingValue)),
          tries: triesStr ? parseInt(triesStr, 10) || null : null,
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
    const allAscents = this.ascents();
    const selected = this.selectedIndices();
    const ascents = allAscents.filter((_, i) => selected.has(i));
    if (ascents.length === 0) return;

    this.importing.set(true);
    const progress$ = new BehaviorSubject<number>(0);
    this.loaderClose$ = this.toast.showLoader('import8a.importing', progress$);

    try {
      // Maps for caching and lookups
      const areaToCoords = new Map<
        string,
        { latitude: number; longitude: number }
      >();
      const areaToSlug = new Map<string, string>(); // areaName (CSV) -> 8anu.cragSlug
      const sectorToCragSlug = new Map<string, string>(); // areaSlug|sectorSlug -> 8anu.sectorSlug
      const sectorTo8aRoutes = new Map<
        string,
        { routes: EightAnuRoute[]; climbingKind: ClimbingKind }
      >();
      const areaRoutesCache = new Map<string, EightAnuRoute[]>();

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

      // 1.0 NEW: Pre-check database to see if we already know these slugs
      const knownAreaSlugs = new Set<string>();
      const knownSectorSlugs = new Set<string>();

      // Query areas
      const allAreaSlugsInCSV = [
        ...new Set(ascents.map((a) => slugify(a.location_name))),
      ];
      const { data: existingAreas } = await this.supabase.client
        .from('areas')
        .select('slug, eight_anu_crag_slugs')
        .in('slug', allAreaSlugsInCSV);

      if (existingAreas) {
        for (const area of existingAreas) {
          if (
            area.eight_anu_crag_slugs &&
            area.eight_anu_crag_slugs.length > 0
          ) {
            // Find the original area name that matches this slug
            const originalName = ascents.find(
              (a) => slugify(a.location_name) === area.slug,
            )?.location_name;
            if (originalName) {
              areaToSlug.set(originalName, area.eight_anu_crag_slugs[0]);
              knownAreaSlugs.add(area.slug);
            }
          }
        }
      }

      // Query crags
      const allSectorSlugsInCSV = [
        ...new Set(ascents.map((a) => slugify(a.sector_name))),
      ];
      const { data: existingCrags } = await this.supabase.client
        .from('crags')
        .select('slug, eight_anu_sector_slugs, area_id, areas!inner(slug)')
        .in('slug', allSectorSlugsInCSV);

      if (existingCrags) {
        for (const crag of existingCrags) {
          if (
            crag.eight_anu_sector_slugs &&
            crag.eight_anu_sector_slugs.length > 0
          ) {
            const areaSlug = crag.areas.slug;
            sectorToCragSlug.set(
              `${areaSlug}|${crag.slug}`,
              crag.eight_anu_sector_slugs[0],
            );
            knownSectorSlugs.add(`${areaSlug}|${crag.slug}`);
          }
        }
      }

      const totalUnits = uniqueAreas.length + uniqueSectorsToFetch.length + 5;
      let completedUnits = 0;

      const incrementProgress = () => {
        completedUnits++;
        progress$.next(
          Math.min(100, Math.floor((completedUnits / totalUnits) * 100)),
        );
      };

      // 1.1 Parallel fetching for unique areas (limit concurrency to 5)
      const AREA_CONCURRENCY = 2;
      for (let i = 0; i < uniqueAreas.length; i += AREA_CONCURRENCY) {
        const batch = uniqueAreas.slice(i, i + AREA_CONCURRENCY);
        await Promise.all(
          batch.map(async ([areaName]) => {
            const areaSlug = slugify(areaName);
            if (knownAreaSlugs.has(areaSlug)) {
              incrementProgress();
              return;
            }

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
              this.toast.error(
                `${this.translate.instant('import8a.errors.fetchAscents')}: ${areaName}`,
              );
            }
            incrementProgress();
          }),
        );
      }

      const SECTOR_CONCURRENCY = 1; // Lower concurrency for routes as it's heavier
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
              this.toast.error(
                `${this.translate.instant('import8a.errors.fetchAscents')}: ${s.sectorName}`,
              );
            }
            incrementProgress();
          }),
        );
      }

      // 2. Prepare payload for SQL function
      const payload: Import8aPayload[] = ascents.map((a) => {
        const areaSlug = slugify(a.location_name);
        const area8aSlug = areaToSlug.get(a.location_name) || areaSlug;
        const sectorSlug = slugify(a.sector_name);
        const crag8aSlug =
          sectorToCragSlug.get(`${areaSlug}|${sectorSlug}`) || sectorSlug;

        const coords = areaToCoords.get(a.location_name);

        const csvKey = `${areaSlug}|${sectorSlug}|${slugify(a.name)}`;
        const resolved = this.resolvedSlugsMap.get(csvKey);

        const route_8a_slug =
          a.route_8a_slug || resolved?.eightAnuSlugs?.[0] || null;
        const eight_anu_route_slugs =
          resolved?.eightAnuSlugs || (route_8a_slug ? [route_8a_slug] : []);
        const routeSlug = resolved?.slug || route_8a_slug || slugify(a.name);
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
          route_8a_slug,
          eight_anu_route_slugs,
          grade,
          climbing_kind: a.climbing_kind ?? ClimbingKinds.SPORT,
          date: a.date.split('T')[0],
          style: a.type,
          attempts: a.tries,
          rating: a.rating === 0 ? null : a.rating,
          comment: a.comment,
          recommended: a.recommended,
        };
      });

      const existingAscentKeys = await this.getOrLoadExistingAscentKeys();
      const { payload: deduplicatedPayload, skipped: skippedBeforeImport } =
        this.deduplicatePayloadAgainstExistingAscents(
          payload,
          existingAscentKeys,
        );

      // 3. Call RPC in batches
      const CHUNK_SIZE = 50;
      const chunks: Import8aPayload[][] = [];
      for (let i = 0; i < deduplicatedPayload.length; i += CHUNK_SIZE) {
        chunks.push(deduplicatedPayload.slice(i, i + CHUNK_SIZE));
      }

      const results = await Promise.all(
        chunks.map(async (chunk) => {
          const { data, error } = await this.supabase.client.rpc(
            'import_8a_ascents',
            {
              ascents: chunk as unknown as Json[],
            },
          );

          if (error) {
            console.error('[8a Import] RPC Error:', error);
            throw error;
          }

          completedUnits += chunk.length;
          progress$.next(
            Math.min(100, Math.floor((completedUnits / totalUnits) * 100)),
          );

          return data;
        }),
      );

      let totalInserted = 0;
      let totalSkipped = skippedBeforeImport;
      let totalCreatedAreas = 0;
      let totalCreatedCrags = 0;
      let totalCreatedRoutes = 0;

      for (const data of results) {
        if (data) {
          totalInserted += data.inserted_ascents ?? 0;
          totalSkipped += data.skipped_ascents ?? 0;
          totalCreatedAreas += data.created_areas ?? 0;
          totalCreatedCrags += data.created_crags ?? 0;
          totalCreatedRoutes += data.created_routes ?? 0;
        }
      }

      // 4. Reload resources
      this.ascentsService.refreshResources();
      this.global.areasListResource.reload();
      this.global.areasMapResource.reload();
      this.global.mapResource.reload();
      this.global.cragsListResource.reload();
      this.global.cragDetailResource.reload();
      this.global.cragRoutesResource.reload();
      progress$.next(100);

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
          createdInfo += ` <strong>+${totalCreatedAreas}</strong> ${this.translate.instant(totalCreatedAreas === 1 ? 'area' : 'areas').toLowerCase()}`;
        }
        if (totalCreatedCrags > 0) {
          createdInfo += ` <strong>+${totalCreatedCrags}</strong> ${this.translate.instant(totalCreatedCrags === 1 ? 'crag' : 'crags').toLowerCase()}`;
        }
        if (totalCreatedRoutes > 0) {
          createdInfo += ` <strong>+${totalCreatedRoutes}</strong> ${this.translate.instant(totalCreatedRoutes === 1 ? 'route' : 'routes').toLowerCase()}`;
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

  private async resolveCsvAscentsWith8aData(
    ascents: EightAnuAscent[],
  ): Promise<void> {
    if (ascents.length === 0) return;

    this.searching.set(true);
    const progress$ = new BehaviorSubject<number>(0);
    const loaderClose = this.toast.showLoader(
      'import8a.resolvingRoutes',
      progress$,
    );

    try {
      this.resolvedSlugsMap.clear();

      const uniqueItems = new Map<
        string,
        { area: string; crag: string; name: string }
      >();
      for (const a of ascents) {
        const key = `${slugify(a.location_name)}|${slugify(a.sector_name)}|${slugify(a.name)}`;
        if (!uniqueItems.has(key)) {
          uniqueItems.set(key, {
            area: a.location_name,
            crag: a.sector_name,
            name: a.name,
          });
        }
      }

      const itemsToResolve = Array.from(uniqueItems.values());
      const totalItems = itemsToResolve.length;
      let completedItems = 0;

      const BATCH_SIZE = 100;

      for (let i = 0; i < totalItems; i += BATCH_SIZE) {
        const batch = itemsToResolve.slice(i, i + BATCH_SIZE);
        const names = batch.map((b) => b.name);

        const { data: matchedRoutes, error } = await this.supabase.client
          .from('routes')
          .select(
            `
            name,
            slug,
            eight_anu_route_slugs,
            crag:crags!inner(
              name,
              slug,
              area:areas!inner(
                name,
                slug
              )
            )
          `,
          )
          .in('name', names)
          .returns<
            {
              name: string;
              slug: string;
              eight_anu_route_slugs: string[] | null;
              crag: {
                name: string;
                slug: string;
                area: {
                  name: string;
                  slug: string;
                };
              };
            }[]
          >();

        if (error) {
          console.error(
            '[8a Import] Error fetching routes for resolution:',
            error,
          );
        }

        if (matchedRoutes) {
          for (const r of matchedRoutes) {
            // Find which items in the current batch match this route's name
            const matchingItems = batch.filter(
              (b) => slugify(b.name) === slugify(r.name),
            );

            for (const item of matchingItems) {
              const key = `${slugify(item.area)}|${slugify(item.crag)}|${slugify(item.name)}`;
              this.resolvedSlugsMap.set(key, {
                slug: r.slug,
                eightAnuSlugs: r.eight_anu_route_slugs || [],
              });
            }
          }
        }

        completedItems += batch.length;
        progress$.next(Math.floor((completedItems / totalItems) * 100));
      }

      // Second pass: for routes not resolved by name, check by 8a slug
      const unresolvedItems = itemsToResolve.filter((item) => {
        const key = `${slugify(item.area)}|${slugify(item.crag)}|${slugify(item.name)}`;
        return !this.resolvedSlugsMap.has(key);
      });

      if (unresolvedItems.length > 0) {
        // Build csvKey -> route_8a_slug from CSV data (no API call needed)
        const csvSlugByKey = new Map<string, string>();
        for (const a of ascents) {
          if (a.route_8a_slug) {
            const key = `${slugify(a.location_name)}|${slugify(a.sector_name)}|${slugify(a.name)}`;
            csvSlugByKey.set(key, a.route_8a_slug);
          }
        }

        // Separate items: those with a known CSV slug vs. those needing 8anu API lookup
        const slugByKey = new Map<string, string>(); // csvKey -> 8a slug
        const itemsNeedingApi: typeof unresolvedItems = [];

        for (const item of unresolvedItems) {
          const key = `${slugify(item.area)}|${slugify(item.crag)}|${slugify(item.name)}`;
          const csvSlug = csvSlugByKey.get(key);
          if (csvSlug) {
            slugByKey.set(key, csvSlug);
          } else {
            itemsNeedingApi.push(item);
          }
        }

        // Query 8anu API only for routes without a CSV slug (minimise calls)
        const API_CONCURRENCY = 2;
        for (let i = 0; i < itemsNeedingApi.length; i += API_CONCURRENCY) {
          const apiBatch = itemsNeedingApi.slice(i, i + API_CONCURRENCY);
          await Promise.all(
            apiBatch.map(async (item) => {
              const key = `${slugify(item.area)}|${slugify(item.crag)}|${slugify(item.name)}`;
              try {
                const result = await this.eightAnuService.searchRoute(
                  item.area,
                  item.crag,
                  item.name,
                );
                if (result?.zlaggableSlug) {
                  slugByKey.set(key, result.zlaggableSlug);
                }
              } catch (e) {
                console.error(
                  `[8a Import] Error fetching 8a slug for route ${item.name}:`,
                  e,
                );
              }
            }),
          );
        }

        // Single batched DB query: find routes that share any of these 8a slugs
        if (slugByKey.size > 0) {
          const allSlugs = [...new Set(slugByKey.values())];
          const SLUG_CHUNK_SIZE = 50;
          const routesBySlugs: {
            name: string;
            slug: string;
            eight_anu_route_slugs: string[] | null;
          }[] = [];

          for (let i = 0; i < allSlugs.length; i += SLUG_CHUNK_SIZE) {
            const slugChunk = allSlugs.slice(i, i + SLUG_CHUNK_SIZE);
            const { data } = await this.supabase.client
              .from('routes')
              .select('name, slug, eight_anu_route_slugs')
              .overlaps('eight_anu_route_slugs', slugChunk);
            if (data) routesBySlugs.push(...data);
          }

          for (const [key, slug8a] of slugByKey.entries()) {
            if (this.resolvedSlugsMap.has(key)) continue;
            const match = routesBySlugs.find((r) =>
              r.eight_anu_route_slugs?.includes(slug8a),
            );
            if (match) {
              this.resolvedSlugsMap.set(key, {
                slug: match.slug,
                eightAnuSlugs: match.eight_anu_route_slugs || [],
              });
            }
          }
        }
      }
    } catch (e) {
      console.error('[8a Import] Error resolving data:', e);
      this.toast.error(this.translate.instant('import8a.errors.resolve'));
    } finally {
      this.searching.set(false);
      loaderClose.next();
      loaderClose.complete();
    }
  }

  private buildAscentDedupKey(
    date: string | null | undefined,
    slug: string | null | undefined,
    is8aSlug = false,
  ): string | null {
    const normalizedDate = (date ?? '').split('T')[0].trim();
    if (!normalizedDate || !slug) return null;
    const identifier = is8aSlug ? `8a:${slug}` : slugify(slug);
    return `${normalizedDate}|${identifier}`;
  }

  private async deduplicateCsvAscentsAgainstExisting(
    ascents: EightAnuAscent[],
  ): Promise<{ ascents: EightAnuAscent[]; skipped: number }> {
    if (ascents.length === 0) {
      return { ascents, skipped: 0 };
    }

    const csvDateRange = this.getCsvDateRange(ascents);
    const existingKeys = await this.getOrLoadExistingAscentKeys(
      csvDateRange || undefined,
    );
    const seenInCsv = new Set<string>();
    const deduplicatedAscents: EightAnuAscent[] = [];
    let skipped = 0;

    for (const ascent of ascents) {
      const keysToCheck: (string | null)[] = [];
      const csvKey = `${slugify(ascent.location_name)}|${slugify(ascent.sector_name)}|${slugify(ascent.name)}`;
      const resolved = this.resolvedSlugsMap.get(csvKey);

      // 1. Check by local slug from DB if we resolved it
      if (resolved?.slug) {
        keysToCheck.push(this.buildAscentDedupKey(ascent.date, resolved.slug));
      }

      // 2. Always check by name-based slug as fallback/redundancy
      keysToCheck.push(this.buildAscentDedupKey(ascent.date, ascent.name));

      // 2. Check by 8a slug (from CSV or from resolved DB data)
      const eightAnuSlug = ascent.route_8a_slug || resolved?.eightAnuSlugs?.[0];
      if (eightAnuSlug) {
        keysToCheck.push(
          this.buildAscentDedupKey(ascent.date, eightAnuSlug, true),
        );
      }

      const isDuplicate = keysToCheck.some(
        (k) => k && (existingKeys.has(k) || seenInCsv.has(k)),
      );

      if (isDuplicate) {
        skipped++;
        continue;
      }

      for (const k of keysToCheck) {
        if (k) seenInCsv.add(k);
      }
      deduplicatedAscents.push(ascent);
    }

    return { ascents: deduplicatedAscents, skipped };
  }

  private deduplicatePayloadAgainstExistingAscents(
    payload: Import8aPayload[],
    existingKeys: Set<string>,
  ): { payload: Import8aPayload[]; skipped: number } {
    if (payload.length === 0) {
      return { payload, skipped: 0 };
    }

    const seenInImport = new Set<string>();
    const deduplicatedPayload: Import8aPayload[] = [];
    let skipped = 0;

    for (const ascent of payload) {
      const keysToCheck: (string | null)[] = [];

      // 1. Check by local slug
      keysToCheck.push(
        this.buildAscentDedupKey(ascent.date, ascent.route_slug),
      );

      // 2. Check by 8a slug
      if (ascent.route_8a_slug) {
        keysToCheck.push(
          this.buildAscentDedupKey(ascent.date, ascent.route_8a_slug, true),
        );
      }

      const isDuplicate = keysToCheck.some(
        (k) => k && (existingKeys.has(k) || seenInImport.has(k)),
      );

      if (isDuplicate) {
        skipped++;
        continue;
      }

      for (const k of keysToCheck) {
        if (k) seenInImport.add(k);
      }
      deduplicatedPayload.push(ascent);
    }

    return { payload: deduplicatedPayload, skipped };
  }

  private async getOrLoadExistingAscentKeys(range?: {
    from: string;
    to: string;
  }): Promise<Set<string>> {
    if (
      this.existingAscentKeysCache &&
      (!range ||
        (this.existingAscentKeysCacheRange !== null &&
          this.existingAscentKeysCacheRange.from <= range.from &&
          this.existingAscentKeysCacheRange.to >= range.to))
    ) {
      return this.existingAscentKeysCache;
    }

    const userId = this.supabase.authUserId();
    if (!userId) {
      this.existingAscentKeysCache = new Set<string>();
      this.existingAscentKeysCacheRange = range || null;
      return this.existingAscentKeysCache;
    }

    let query = this.supabase.client
      .from('route_ascents')
      .select(
        `
          date,
          route:routes!inner(
            slug,
            name,
            eight_anu_route_slugs
          )
        `,
      )
      .eq('user_id', userId)
      .not('date', 'is', null);

    if (range) {
      query = query.gte('date', range.from).lte('date', range.to);
    }

    const { data, error } = await query;

    if (error) {
      console.error(
        '[8a Import] Error loading existing ascents for deduplication:',
        error,
      );
      this.existingAscentKeysCache = new Set<string>();
      this.existingAscentKeysCacheRange = range || null;
      return this.existingAscentKeysCache;
    }

    const existingKeys = new Set<string>();
    for (const ascent of (data ?? []) as ExistingUserAscentKey[]) {
      const routeDataRaw = Array.isArray(ascent.route)
        ? ascent.route[0]
        : ascent.route;
      const routeData =
        routeDataRaw && typeof routeDataRaw === 'object'
          ? (routeDataRaw as {
              slug?: string | null;
              name?: string | null;
              eight_anu_route_slugs?: string[] | null;
              crag?:
                | {
                    slug?: string | null;
                    area?:
                      | { slug?: string | null }
                      | { slug?: string | null }[]
                      | null;
                  }
                | {
                    slug?: string | null;
                    area?:
                      | { slug?: string | null }
                      | { slug?: string | null }[]
                      | null;
                  }[]
                | null;
            })
          : null;

      const routeIdentifier = routeData?.slug || routeData?.name || '';
      const key = this.buildAscentDedupKey(ascent.date, routeIdentifier);
      if (key) {
        existingKeys.add(key);
      }

      // Also add a name-only key to catch routes with different slugs but same names
      if (routeData?.name) {
        const nameKey = this.buildAscentDedupKey(ascent.date, routeData.name);
        if (nameKey) {
          existingKeys.add(nameKey);
        }
      }

      // Add keys for each 8a slug
      if (ascent.date && routeData?.eight_anu_route_slugs) {
        for (const slug of routeData.eight_anu_route_slugs) {
          const slugKey = this.buildAscentDedupKey(ascent.date, slug, true);
          if (slugKey) {
            existingKeys.add(slugKey);
          }
        }
      }
    }

    this.existingAscentKeysCache = existingKeys;
    this.existingAscentKeysCacheRange = range || null;
    return existingKeys;
  }

  private getCsvDateRange(
    ascents: EightAnuAscent[],
  ): { from: string; to: string } | null {
    const normalizedDates = ascents
      .map((a) => (a.date || '').split('T')[0].trim())
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort();

    if (normalizedDates.length === 0) {
      return null;
    }

    return {
      from: normalizedDates[0],
      to: normalizedDates[normalizedDates.length - 1],
    };
  }
}
