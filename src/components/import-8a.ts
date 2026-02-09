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
  firstValueFrom,
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
  RouteAscentDto,
  RouteAscentInsertDto,
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

    const isAdmin = this.supabase.userRole() === 'admin';

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

      for (const [areaName, countryCode] of uniqueAreas) {
        const searchResult = await this.eightAnuService.searchCrag(
          countryCode,
          areaName,
          undefined,
          1,
        );
        if (searchResult) {
          if (searchResult.coordinates) {
            areaToCoords.set(areaName, searchResult.coordinates);
          }
          if (searchResult.cragSlug) {
            areaToSlug.set(areaName, searchResult.cragSlug);
          }
        }
        incrementProgress();
      }

      // 1.2 Fetch all routes for each unique sector mentioned in the import to get correct slugs
      const sectorTo8aRoutes = new Map<
        string,
        { routes: EightAnuRoute[]; climbingKind: ClimbingKind }
      >();
      const sectorToCragSlug = new Map<string, string>(); // areaSlug|sectorSlug -> 8anu.sectorSlug

      for (const s of uniqueSectorsToFetch) {
        try {
          const countrySlug = this.eightAnuService.getCountrySlug(
            s.countryCode,
          );
          const area8aSlug =
            areaToSlug.get(s.locationName) || slugify(s.locationName);
          const areaSlug = slugify(s.locationName);
          const sectorSlug = slugify(s.sectorName);

          // Get the real sectorSlug from 8a.nu (searching for routes in that sector)
          // According to user:
          // area.slug (our app) = 8anu.cragSlug
          // crag.slug (our app) = 8anu.sectorSlug
          const searchResult = await this.eightAnuService.searchRoute(
            s.countryCode,
            s.locationName,
            s.sectorName,
            undefined,
            1,
          );

          if (searchResult) {
            const realSectorSlug = searchResult.sectorSlug;
            const realAreaSlug = searchResult.cragSlug || area8aSlug;

            console.log(
              `[8a Import] Found real slugs for ${s.sectorName}: sectorSlug=${realSectorSlug}, areaSlug=${realAreaSlug}`,
            );

            sectorToCragSlug.set(`${areaSlug}|${sectorSlug}`, realSectorSlug);

            console.log(
              `[8a Import] Stored sectorSlug for ${areaSlug}|${sectorSlug}: ${realSectorSlug}`,
            );

            const category =
              s.climbingKind === ClimbingKinds.BOULDER
                ? 'bouldering'
                : 'sportclimbing';

            const response = await firstValueFrom(
              this.eightAnuService.getRoutes(
                category,
                countrySlug,
                realAreaSlug, // This is the 8anu cragSlug (our Area)
                realSectorSlug, // This is the 8anu sectorSlug (our Crag)
              ),
              { defaultValue: null },
            );
            if (response?.items) {
              console.log(
                `[8a Import] Fetched ${response.items.length} routes from 8a.nu for ${s.sectorName}`,
              );
              sectorTo8aRoutes.set(`${areaSlug}|${sectorSlug}`, {
                routes: response.items,
                climbingKind: s.climbingKind,
              });
            } else {
              console.warn(
                `[8a Import] No routes found in 8a.nu response for ${s.sectorName}`,
              );
            }
          } else {
            console.warn(
              `[8a Import] Search result not found for ${s.sectorName} in ${s.locationName}`,
            );
          }
        } catch (e) {
          console.error(
            `[8a Import] Error fetching routes for sector ${s.sectorName}:`,
            e,
          );
        }
        incrementProgress();
      }

      const toInsert: RouteAscentInsertDto[] = [];

      const CHUNK_SIZE = 50;

      // 2. Identify/Create Areas
      let createdAreasCount = 0;
      console.log('[8a Import] Identifying/Creating areas');
      const uniqueAreaSlugs = uniqueAreaNames.map(
        (n) => areaToSlug.get(n) || slugify(n),
      );
      const existingAreas: {
        id: number;
        name: string;
        slug: string;
        eight_anu_crag_slugs: string[] | null;
      }[] = [];
      for (let i = 0; i < uniqueAreaSlugs.length; i += CHUNK_SIZE) {
        const chunk = uniqueAreaSlugs.slice(i, i + CHUNK_SIZE);
        const { data, error } = await this.supabase.client
          .from('areas')
          .select('id, name, slug, eight_anu_crag_slugs')
          .or(
            `slug.in.(${chunk.join(',')}),eight_anu_crag_slugs.ov.{${chunk.join(',')}}`,
          );

        if (error) throw error;
        if (data) existingAreas.push(...data);
      }

      const areaMap = new Map<string, number>();
      if (existingAreas) {
        for (const area of existingAreas) {
          areaMap.set(slugify(area.name), area.id);
          // Also map by slug and 8a slugs
          areaMap.set(area.slug, area.id);
          if (area.eight_anu_crag_slugs) {
            area.eight_anu_crag_slugs.forEach((s) => areaMap.set(s, area.id));
          }
        }
      }

      // Create missing areas (ONLY if admin)
      const areasToCreate = uniqueAreaNames.filter((name) => {
        const slug = areaToSlug.get(name) || slugify(name);
        return !areaMap.has(slugify(name)) && !areaMap.has(slug);
      });

      if (isAdmin && areasToCreate.length > 0) {
        const areaUpsertData = Array.from(
          new Map(
            areasToCreate.map((name) => {
              const slug = areaToSlug.get(name) || slugify(name);
              const eightAnuSlug = areaToSlug.get(name);
              return [
                slug,
                {
                  name,
                  slug: slugify(name),
                  eight_anu_crag_slugs: eightAnuSlug ? [eightAnuSlug] : [],
                },
              ];
            }),
          ).values(),
        );

        const { data: newAreas, error: areaError } = await this.supabase.client
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
      incrementProgress();

      // 3. Identify/Create Crags
      console.log('[8a Import] Identifying/Creating crags');
      const uniqueCragSlugs = [
        ...new Set(
          ascents.map((a) => {
            const areaSlug = slugify(a.location_name);
            const sectorSlug = slugify(a.sector_name);
            return (
              sectorToCragSlug.get(`${areaSlug}|${sectorSlug}`) ||
              slugify(a.sector_name)
            );
          }),
        ),
      ];
      const uniqueifiedCragSlugs = [
        ...new Set(
          ascents.map(
            (a) => `${slugify(a.sector_name)}-${slugify(a.location_name)}`,
          ),
        ),
      ];

      const allPossibleCragSlugs = [
        ...new Set([...uniqueCragSlugs, ...uniqueifiedCragSlugs]),
      ];

      const existingCrags: {
        id: number;
        name: string;
        slug: string;
        area_id: number;
        eight_anu_sector_slugs: string[] | null;
      }[] = [];
      for (let i = 0; i < allPossibleCragSlugs.length; i += CHUNK_SIZE) {
        const chunk = allPossibleCragSlugs.slice(i, i + CHUNK_SIZE);
        const { data, error } = await this.supabase.client
          .from('crags')
          .select('id, name, slug, area_id, eight_anu_sector_slugs')
          .or(
            `slug.in.(${chunk.join(',')}),eight_anu_sector_slugs.ov.{${chunk.join(',')}}`,
          );

        if (error) throw error;
        if (data) existingCrags.push(...data);
      }

      const cragMap = new Map<string, number>(); // key = "areaId|cragSlug"
      if (existingCrags) {
        for (const crag of existingCrags) {
          cragMap.set(`${crag.area_id}|${slugify(crag.name)}`, crag.id);
          cragMap.set(`${crag.area_id}|${crag.slug}`, crag.id);
          if (crag.eight_anu_sector_slugs) {
            crag.eight_anu_sector_slugs.forEach((s) =>
              cragMap.set(`${crag.area_id}|${s}`, crag.id),
            );
          }
        }
      }

      let createdCragsCount = 0;
      const cragsToCreate: {
        name: string;
        area_id: number;
        area_name: string;
        country_code: string;
        climbing_kind: ClimbingKind;
        slug: string;
      }[] = [];

      for (const a of ascents) {
        const areaId =
          areaMap.get(slugify(a.location_name)) ||
          areaMap.get(areaToSlug.get(a.location_name) || '');
        if (areaId) {
          const areaSlug = slugify(a.location_name);
          const sectorSlug = slugify(a.sector_name);
          const eightAnuSectorSlug = sectorToCragSlug.get(
            `${areaSlug}|${sectorSlug}`,
          );

          const cragKeyName = `${areaId}|${slugify(a.sector_name)}`;
          const cragKeySlug = eightAnuSectorSlug
            ? `${areaId}|${eightAnuSectorSlug}`
            : null;

          const cragId =
            cragMap.get(cragKeyName) ||
            (cragKeySlug ? cragMap.get(cragKeySlug) : null);

          if (!cragId) {
            cragsToCreate.push({
              name: a.sector_name,
              area_id: areaId,
              area_name: a.location_name,
              country_code: a.country_code,
              climbing_kind: a.climbing_kind!,
              slug: eightAnuSectorSlug || slugify(a.sector_name),
            });
            cragMap.set(cragKeyName, -1); // Avoid duplicating in this batch
          }
        }
      }

      if (isAdmin && cragsToCreate.filter((c) => c.area_id !== -1).length > 0) {
        const cragsUpsertData = cragsToCreate
          .filter((c) => c.area_id !== -1)
          .map((c) => {
            const coords = areaToCoords.get(c.area_name);

            return {
              name: c.name,
              slug: c.slug,
              area_id: c.area_id,
              latitude: coords?.latitude ?? null,
              longitude: coords?.longitude ?? null,
              eight_anu_sector_slugs: [c.slug],
            };
          });

        if (cragsUpsertData.length > 0) {
          console.log(
            `[8a Import] Inserting ${cragsUpsertData.length} new crags`,
          );
          const { data: newCrags, error: insertCragsError } =
            await this.supabase.client
              .from('crags')
              .insert(cragsUpsertData)
              .select('id, name, area_id');

          if (insertCragsError) {
            console.error(
              '[8a Import] Error inserting crags:',
              insertCragsError,
            );
            throw insertCragsError;
          }

          if (newCrags) {
            console.log(
              `[8a Import] Successfully created ${newCrags.length} new crags`,
            );
            createdCragsCount = newCrags.length;
            for (const a of ascents) {
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
      }
      incrementProgress();

      // 4. Match/Create Routes
      console.log('[8a Import] Identifying/Creating routes');
      const allCragIds = [...new Set(cragMap.values())].filter((id) => id > 0);
      const existingRoutes: {
        id: number;
        name: string;
        slug: string;
        crag_id: number;
        climbing_kind: ClimbingKind;
        eight_anu_route_slugs: string[] | null;
      }[] = [];

      // Get all route slugs from ascents and 8a routes to search
      const allRouteSlugsToSearch = new Set<string>();
      ascents.forEach((a) => allRouteSlugsToSearch.add(slugify(a.name)));
      sectorTo8aRoutes.forEach((data) =>
        data.routes.forEach((r) => allRouteSlugsToSearch.add(r.zlaggableSlug)),
      );

      for (let i = 0; i < allCragIds.length; i += CHUNK_SIZE) {
        const chunk = allCragIds.slice(i, i + CHUNK_SIZE);
        const { data, error } = await this.supabase.client
          .from('routes')
          .select(
            'id, name, slug, crag_id, climbing_kind, eight_anu_route_slugs',
          )
          .in('crag_id', chunk);

        if (error) throw error;
        if (data) existingRoutes.push(...data);
      }

      const getRouteKey = (cragId: number, slug: string, kind: ClimbingKind) =>
        `${cragId}|${slug}|${kind}`;

      const routeMap = new Map<string, number>();
      for (const r of existingRoutes) {
        // Map by actual slug
        routeMap.set(getRouteKey(r.crag_id, r.slug, r.climbing_kind), r.id);
        // Fallback map by name-slug
        routeMap.set(
          getRouteKey(r.crag_id, slugify(r.name), r.climbing_kind),
          r.id,
        );
        // Map by 8a slugs
        if (r.eight_anu_route_slugs) {
          r.eight_anu_route_slugs.forEach((s) =>
            routeMap.set(getRouteKey(r.crag_id, s, r.climbing_kind), r.id),
          );
        }
      }

      const routesToCreate: {
        name: string;
        crag_id: number;
        grade: number;
        crag_name: string;
        climbing_kind: ClimbingKind;
        slug: string;
      }[] = [];

      let createdRoutesCount = 0;

      // First, add all routes from 8a.nu for ALL crags (both existing and newly created)
      for (const [areaAndSector, data] of sectorTo8aRoutes.entries()) {
        const [areaSlug, sectorSlug] = areaAndSector.split('|');
        // Find areaId
        const areaId = areaMap.get(areaSlug);
        if (!areaId) continue;
        const cragId = cragMap.get(`${areaId}|${sectorSlug}`);
        if (!cragId || cragId === -1) continue;

        for (const r8a of data.routes) {
          const climbingKind = data.climbingKind;
          const rKey = getRouteKey(cragId, r8a.zlaggableSlug, climbingKind);
          const rKeyName = getRouteKey(
            cragId,
            slugify(r8a.zlaggableName),
            climbingKind,
          );

          if (!routeMap.has(rKey) && !routeMap.has(rKeyName)) {
            const difficulty = r8a.difficulty.toLowerCase() as GradeLabel;
            const grade = LABEL_TO_VERTICAL_LIFE[difficulty] ?? 3;

            console.log(
              `[8a Import] Adding 8a route to creation list: ${r8a.zlaggableName} (slug: ${r8a.zlaggableSlug}, grade: ${difficulty}) for cragId ${cragId}`,
            );

            routesToCreate.push({
              name: r8a.zlaggableName,
              crag_id: cragId,
              grade,
              crag_name: sectorSlug,
              climbing_kind: climbingKind,
              slug: r8a.zlaggableSlug,
            });
            routeMap.set(rKey, -1);
          } else {
            console.log(
              `[8a Import] 8a route already exists or is in list: ${r8a.zlaggableName} for cragId ${cragId}`,
            );
          }
        }
      }

      // Then, match CSV ascents and add missing routes
      for (const a of ascents) {
        const areaId =
          areaMap.get(slugify(a.location_name)) ||
          areaMap.get(areaToSlug.get(a.location_name) || '');
        if (!areaId) continue;
        const cragId = cragMap.get(`${areaId}|${slugify(a.sector_name)}`);
        if (!cragId || cragId === -1) continue;

        const areaSlug = slugify(a.location_name);
        const sectorSlug = slugify(a.sector_name);
        const sectorData = sectorTo8aRoutes.get(`${areaSlug}|${sectorSlug}`);
        const match = sectorData?.routes.find(
          (r) => slugify(r.zlaggableName) === slugify(a.name),
        );

        const routeSlug = match ? match.zlaggableSlug : slugify(a.name);
        const climbingKind = a.climbing_kind!;
        const rKey = getRouteKey(cragId, routeSlug, climbingKind);
        const rKeyName = getRouteKey(cragId, slugify(a.name), climbingKind);

        let routeId = routeMap.get(rKey) || routeMap.get(rKeyName);

        if (!routeId) {
          const grade = LABEL_TO_VERTICAL_LIFE[a.difficulty] ?? 3;
          console.log(
            `[8a Import] Adding CSV route to creation list (not found in 8a fetch): ${a.name} for cragId ${cragId}`,
          );
          routesToCreate.push({
            name: a.name,
            crag_id: cragId,
            grade,
            crag_name: a.sector_name,
            climbing_kind: climbingKind,
            slug: routeSlug,
          });
          routeMap.set(rKey, -1);
          routeId = -1;
        }

        if (routeId && routeId !== -1) {
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
        }
      }

      if (routesToCreate.length > 0) {
        const routesUpsertData = routesToCreate.map((r) => {
          return {
            name: r.name,
            slug: r.slug,
            crag_id: r.crag_id,
            climbing_kind: r.climbing_kind,
            grade: r.grade,
            eight_anu_route_slugs: [r.slug],
          };
        });

        console.log(
          `[8a Import] Inserting ${routesUpsertData.length} new routes into Supabase`,
        );
        const { data: newRoutes, error: insertError } =
          await this.supabase.client
            .from('routes')
            .insert(routesUpsertData)
            .select('id, name, slug, crag_id, climbing_kind');

        if (insertError) {
          console.error('[8a Import] Error inserting routes:', insertError);
          throw insertError;
        }

        if (newRoutes) {
          createdRoutesCount = newRoutes.length;
          console.log(
            `[8a Import] Successfully created ${newRoutes.length} new routes`,
          );
          // Map the newly created routes back to toInsert
          for (const a of ascents) {
            const areaId = areaMap.get(slugify(a.location_name));
            const cragId = cragMap.get(`${areaId}|${slugify(a.sector_name)}`);
            const areaSlug = slugify(a.location_name);
            const sectorSlug = slugify(a.sector_name);
            const sectorData = sectorTo8aRoutes.get(
              `${areaSlug}|${sectorSlug}`,
            );
            const match = sectorData?.routes.find(
              (r) => slugify(r.zlaggableName) === slugify(a.name),
            );
            const routeSlug = match ? match.zlaggableSlug : slugify(a.name);
            const climbingKind = a.climbing_kind!;

            const nr = newRoutes.find(
              (r) =>
                r.crag_id === cragId &&
                r.climbing_kind === climbingKind &&
                (r.slug === routeSlug ||
                  r.slug.startsWith(routeSlug + '-') ||
                  slugify(r.name) === slugify(a.name)),
            );

            if (nr) {
              const grade = LABEL_TO_VERTICAL_LIFE[a.difficulty] ?? 0;
              toInsert.push({
                route_id: nr.id,
                user_id: this.supabase.authUserId()!,
                comment: a.comment,
                date: a.date.split('T')[0],
                type: a.type,
                rate: a.rating === 0 ? null : a.rating,
                attempts: a.tries,
                recommended: a.recommended,
                grade: grade > 0 ? grade : null,
              });
            }
          }
        }
      }
      incrementProgress();

      // 4.1 Re-map toInsert for routes that were already there
      for (const a of ascents) {
        // Skip if already matched in step 4 or if we already have it in toInsert
        const areaId = areaMap.get(slugify(a.location_name));
        if (!areaId) continue;
        const cragId = cragMap.get(`${areaId}|${slugify(a.sector_name)}`);
        if (!cragId || cragId === -1) continue;

        const areaSlug = slugify(a.location_name);
        const sectorSlug = slugify(a.sector_name);
        const sectorData = sectorTo8aRoutes.get(`${areaSlug}|${sectorSlug}`);
        const match = sectorData?.routes.find(
          (r) => slugify(r.zlaggableName) === slugify(a.name),
        );

        const routeSlug = match ? match.zlaggableSlug : slugify(a.name);
        const climbingKind = a.climbing_kind!;
        const rKey = getRouteKey(cragId, routeSlug, climbingKind);
        const rKeyName = getRouteKey(cragId, slugify(a.name), climbingKind);

        const routeId = routeMap.get(rKey) || routeMap.get(rKeyName);

        if (routeId && routeId !== -1) {
          // Check if already in toInsert for this route and date
          const alreadyIn = toInsert.find(
            (i) => i.route_id === routeId && i.date === a.date.split('T')[0],
          );
          if (!alreadyIn) {
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
      incrementProgress();

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
      incrementProgress();

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
