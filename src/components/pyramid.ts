import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  PLATFORM_ID,
  resource,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  TuiAppearance,
  TuiDataList,
  TuiDialogService,
  TuiDropdown,
  TuiHint,
  TuiIcon,
  TuiScrollbar,
  TuiTextfield,
} from '@taiga-ui/core';
import { TuiDataListWrapper, TuiSelect, TuiSkeleton } from '@taiga-ui/kit';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { UserProfilesService } from '../services/user-profiles.service';
import { SupabaseService } from '../services/supabase.service';
import { GlobalData } from '../services/global-data';
import { AscentsService } from '../services/ascents.service';
import { ToastService } from '../services/toast.service';
import {
  AscentType,
  GRADE_NUMBER_TO_LABEL,
  RouteDto,
  UserPyramidSlotDto,
  VERTICAL_LIFE_GRADES,
} from '../models';

import { GradeComponent } from './avatar-grade';
import { AscentTypeComponent } from './ascent-type';
import { PyramidSlotDialogComponent } from '../dialogs/pyramid-slot-dialog';

export interface PyramidLevel {
  level: number;
  slotsCount: number;
  slots: (UserPyramidSlotDto & {
    route:
      | (RouteDto & { crag?: { slug: string; area?: { slug: string } } })
      | null;
  })[];
}

@Component({
  selector: 'app-pyramid',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    TuiAppearance,
    TuiDataList,
    TuiDataListWrapper,
    TuiDropdown,
    TuiHint,
    TuiIcon,
    TuiScrollbar,
    TuiSelect,
    TuiSkeleton,
    TuiTextfield,
    GradeComponent,
    AscentTypeComponent,
  ],
  template: `
    <div
      class="flex flex-col gap-6 p-6 rounded-2xl bg-[var(--tui-background-base)] shadow-md border border-[var(--tui-border-normal)]"
    >
      <!-- Header with Year Selector -->
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <h2 class="text-xl font-bold flex items-center gap-2">
          <tui-icon icon="@tui.pyramid" />
          {{ 'pyramid.title' | translate }}
        </h2>

        <div class="flex items-center gap-2">
          <tui-textfield
            class="w-32"
            [tuiTextfieldCleaner]="false"
            tuiTextfieldSize="m"
          >
            <input
              tuiSelect
              [ngModel]="selectedYear()"
              (ngModelChange)="selectedYear.set($event)"
              autocomplete="off"
            />
            <tui-data-list *tuiTextfieldDropdown>
              <tui-data-list-wrapper new [items]="years()" />
            </tui-data-list>
          </tui-textfield>
        </div>
      </div>

      <!-- Pyramid Visualizer -->
      <tui-scrollbar class="w-full">
        <div
          class="pyramid-container flex flex-col items-center gap-4 min-h-[420px] pb-6"
          [class.opacity-0]="!isCentered() && !slotsResource.isLoading()"
          #pyramidContainer
        >
          @for (level of pyramidLevels(); track level.level) {
            <div class="pyramid-level flex justify-center gap-2 w-full">
              @for (slot of level.slots; track $index) {
                <div
                  class="pyramid-slot relative group cursor-pointer transition-all duration-300 rounded-xl shadow-sm hover:scale-105"
                  [tuiSkeleton]="isLoading()"
                  [id]="level.level === 1 ? 'pyramid-peak' : null"
                  [class.is-empty]="!slot.route_id"
                  [class.is-completed]="isCompleted(slot)"
                  [class.is-locked]="
                    !isLoading() && !canModifySlot(level.level, slot)
                  "
                  [tuiAppearance]="isCompleted(slot) ? 'positive' : 'neutral'"
                  [tuiAppearanceState]="
                    isLoading()
                      ? null
                      : !canModifySlot(level.level, slot)
                        ? 'disabled'
                        : isCompleted(slot)
                          ? 'active'
                          : null
                  "
                  tabindex="0"
                  (click)="onSlotClick(level.level, $index, slot)"
                  (keydown.enter)="onSlotClick(level.level, $index, slot)"
                  [tuiHint]="
                    slot.route
                      ? slot.route.name
                      : ('pyramid.emptySlot' | translate)
                  "
                >
                  <!-- Slot Content -->
                  <div
                    class="relative z-10 flex flex-col items-center justify-center w-full py-2.5 px-2 text-center"
                  >
                    @if (slot.route) {
                      <div
                        class="flex flex-col items-center gap-1 w-full max-w-[200px]"
                      >
                        <app-grade [grade]="slot.route.grade" [size]="'s'" />
                        <span
                          class="text-[9px] font-bold truncate hidden sm:block w-full leading-tight uppercase opacity-80 hover:underline"
                          (click.zoneless)="
                            $event.stopPropagation(); goToRoute(slot.route!)
                          "
                        >
                          {{ slot.route.name }}
                        </span>
                        @if (isCompleted(slot)) {
                          @let ascent = completedRoutesMap()[slot.route_id!];
                          <div
                            class="hidden sm:flex flex-col items-center gap-1 leading-none pt-1"
                          >
                            <app-ascent-type
                              [type]="ascent.type"
                              size="xs"
                              class="scale-90"
                            />
                            <span
                              class="text-[9px] font-bold text-[var(--tui-status-positive)]"
                            >
                              +{{ ascent.score }} {{ 'points' | translate }}
                            </span>
                          </div>
                        }
                      </div>
                    } @else {
                      <tui-icon
                        icon="@tui.plus"
                        class="opacity-20 group-hover:opacity-50"
                      />
                      <span
                        class="text-[8px] opacity-40 uppercase font-medium"
                        >{{ getExpectedGradeLabel(level.level) }}</span
                      >
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </tui-scrollbar>
    </div>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }

    .pyramid-container {
      perspective: 1000px;
      width: 100%;
      min-width: max-content;
      max-width: 1000px;
      margin: 0 auto;
    }

    .pyramid-level {
      display: flex;
      flex-wrap: nowrap;
      justify-content: center;
      gap: 1.5rem;
      width: fit-content;
      margin: 0 auto;
    }

    .pyramid-slot {
      flex: 1 1 0%;
      min-width: 120px;
      width: max-content;
      min-height: 56px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      border-radius: 16px;
      padding: 0 1rem;
    }

    .pyramid-slot.is-completed {
      box-shadow: 0 0 15px var(--tui-status-positive-pale);
    }

    .pyramid-slot.is-locked {
      opacity: 0.3;
      cursor: not-allowed;
      filter: grayscale(1);
    }

    .pyramid-slot.is-locked:hover .absolute.inset-0 {
      scale: 1;
      background: var(--tui-background-neutral-1);
    }

    @media (max-width: 600px) {
      .pyramid-level {
        gap: 0.5rem;
        margin: 0 auto;
      }
      .pyramid-slot {
        min-width: 80px;
        flex: 1 1 0%;
        min-height: 48px;
        padding: 0 0.5rem;
      }
      .pyramid-slot span {
        font-size: 8px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PyramidComponent implements AfterViewInit {
  userId = input.required<string>();
  startingYear = input<number | null | undefined>(null);

  private userProfilesService = inject(UserProfilesService);
  protected supabase = inject(SupabaseService);
  private dialogs = inject(TuiDialogService);
  private translate = inject(TranslateService);
  private toast = inject(ToastService);
  protected ascentsService = inject(AscentsService);
  private router = inject(Router);
  protected platformId = inject(PLATFORM_ID);
  global = inject(GlobalData);

  @ViewChild('pyramidContainer') pyramidContainer?: ElementRef<HTMLDivElement>;

  isCentered = signal(false);

  isLoading = computed(
    () =>
      this.slotsResource.isLoading() ||
      this.completedRoutesResource.isLoading() ||
      (!this.isCentered() && isPlatformBrowser(this.platformId)),
  );

  currentYear = new Date().getFullYear();
  selectedYear = signal<number>(this.currentYear);

  constructor() {
    effect(() => {
      // Trigger when year changes
      this.selectedYear();
      if (isPlatformBrowser(this.platformId)) {
        this.isCentered.set(false);
        setTimeout(() => this.centerPyramid(), 100);
      }
    });

    effect(() => {
      // Re-center when data actually arrives and potentially changes widths
      const slots = this.slotsResource.value();
      if (slots && isPlatformBrowser(this.platformId)) {
        setTimeout(() => this.centerPyramid(), 150);
      }
    });
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.centerPyramid(), 50);
    }
  }

  private centerPyramid(): void {
    const peak = document.getElementById('pyramid-peak');
    if (peak) {
      peak.scrollIntoView({
        behavior: 'auto',
        inline: 'center',
        block: 'nearest',
      });
      setTimeout(() => this.isCentered.set(true), 50);
    }
  }

  years = computed(() => {
    const start = this.startingYear() || this.currentYear - 14;
    const years: number[] = [];
    for (let y = this.currentYear; y >= start; y--) {
      years.push(y);
    }
    return years;
  });

  slotsResource = resource({
    params: () => ({ userId: this.userId(), year: this.selectedYear() }),
    loader: ({ params }) =>
      this.userProfilesService.getPyramidSlots(params.userId, params.year),
  });

  completedRoutesResource = resource({
    params: () => ({ userId: this.userId(), year: this.selectedYear() }),
    loader: async ({ params }) => {
      if (!isPlatformBrowser(this.platformId)) return [];
      await this.supabase.whenReady();
      const { data, error } = await this.supabase.client
        .from('route_ascents')
        .select('route_id, type, grade, route:routes(grade)')
        .eq('user_id', params.userId)
        .neq('type', 'attempt')
        .gte('date', `${params.year}-01-01`)
        .lte('date', `${params.year}-12-31`);

      if (error) {
        console.error(
          '[PyramidComponent] Error getting completed routes:',
          error,
        );
        return [];
      }
      return data || [];
    },
  });

  // Map of routeId -> Ascent info for completed routes
  completedRoutesMap = computed(() => {
    const ascents = this.completedRoutesResource.value() || [];
    const map: Record<number, { score: number; type: AscentType }> = {};
    ascents.forEach((a) => {
      if (a.route_id && a.type !== 'attempt') {
        const type = (a.type || 'rp') as AscentType;
        const gradeId =
          a.grade || (a.route as { grade: number } | null)?.grade || 0;
        if (gradeId) {
          const score = this.getScore(gradeId, type);
          if (!map[a.route_id] || score > map[a.route_id].score) {
            map[a.route_id] = { score, type };
          }
        }
      }
    });
    return map;
  });

  private getScore(gradeId: number, type: AscentType): number {
    // Base: 8a (29) = 1000. Step = 50.
    // Bonus: OS + 2 steps (100), Flash + 1 step (50).
    let bonus = 0;
    const t = type.toLowerCase();
    if (t === 'os' || t === 'onsight') bonus = 100;
    else if (t === 'f' || t === 'flash') bonus = 50;

    const baseScore = 1000 + (gradeId - 29) * 50;
    return baseScore + bonus;
  }

  pyramidLevels = computed<PyramidLevel[]>(() => {
    const data = this.slotsResource.value() || [];
    const year = this.selectedYear();
    const userId = this.userId();
    const structure = [
      { level: 1, slotsCount: 1 },
      { level: 2, slotsCount: 2 },
      { level: 3, slotsCount: 3 },
      { level: 4, slotsCount: 5 },
      { level: 5, slotsCount: 6 },
    ];

    return structure.map((s) => ({
      ...s,
      slots: Array.from({ length: s.slotsCount }, (_, i) => {
        const found = data.find((d) => d.level === s.level && d.position === i);
        return (
          found || {
            id: '',
            user_id: userId,
            year: year,
            level: s.level,
            position: i,
            route_id: null,
            created_at: '',
            updated_at: '',
            route: null,
          }
        );
      }),
    }));
  });

  isCompleted(slot: UserPyramidSlotDto): boolean {
    if (!slot.route_id) return false;
    return !!this.completedRoutesMap()[slot.route_id];
  }

  canModifySlot(level: number, slot?: UserPyramidSlotDto): boolean {
    if (!this.isOwner()) return false;
    if (slot?.route_id) return true;
    if (level === 1) return true;

    // Check if previous level has at least one slot filled
    const prevLevelSlots =
      this.pyramidLevels().find((l) => l.level === level - 1)?.slots || [];
    return prevLevelSlots.some((s) => !!s.route_id);
  }

  isOwner(): boolean {
    return this.userId() === this.supabase.authUserId();
  }

  getDeducedTopGrade(): number | undefined {
    const levels = this.pyramidLevels();
    for (const l of levels) {
      const filledSlot = l.slots.find((s) => !!s.route);
      if (filledSlot?.route) {
        return filledSlot.route.grade + (l.level - 1);
      }
    }
    return undefined;
  }

  getExpectedGradeLabel(level: number): string {
    const topGrade = this.getDeducedTopGrade();
    if (!topGrade) return '';

    const expectedGrade = topGrade - (level - 1);
    const label = GRADE_NUMBER_TO_LABEL[expectedGrade as VERTICAL_LIFE_GRADES];
    return label || '';
  }

  onSlotClick(
    level: number,
    position: number,
    slot: UserPyramidSlotDto & {
      route:
        | (RouteDto & { crag?: { slug: string; area?: { slug: string } } })
        | null;
    },
  ): void {
    if (!this.canModifySlot(level, slot)) {
      if (slot.route) {
        this.goToRoute(slot.route);
      }
      return;
    }

    const deducedTopGrade = this.getDeducedTopGrade();
    let expectedGrade = deducedTopGrade ? deducedTopGrade - (level - 1) : undefined;

    // We only restrict expected grade selection if there's actually a route
    // in the pyramid that establishes the baseline. If everything is empty,
    // expectedGrade is undefined.

    // Check if deleting this slot would break the pyramid structure.
    // We cannot delete if:
    // 1. We are NOT level 1 AND
    // 2. We are deleting the last filled slot in the current level AND
    // 3. The next level has at least one filled slot.
    // We CAN always delete level 1, but we'll be forced to replace it with
    // the correctly deduced grade because expectedGrade will be set.
    let canDelete = true;
    if (slot.route_id && level > 1) {
      const currentLevelSlots = this.pyramidLevels().find((l) => l.level === level)?.slots || [];
      const filledSlotsInCurrentLevel = currentLevelSlots.filter((s) => !!s.route_id).length;

      const nextLevelSlots = this.pyramidLevels().find((l) => l.level === level + 1)?.slots || [];
      const nextLevelHasFilledSlot = nextLevelSlots.some((s) => !!s.route_id);

      if (filledSlotsInCurrentLevel === 1 && nextLevelHasFilledSlot) {
        canDelete = false;
      }
    }

    this.dialogs
      .open<RouteDto | null>(
        new PolymorpheusComponent(PyramidSlotDialogComponent),
        {
          label: this.translate.instant('pyramid.level') + ' ' + level,
          data: {
            level,
            expectedGrade,
            currentRouteId: slot.route_id,
            currentRoute: slot.route,
            isCompleted: this.isCompleted(slot),
            ascent: slot.route_id ? this.completedRoutesMap()[slot.route_id] : undefined,
            userId: this.userId(),
            year: this.selectedYear(),
            canDelete,
          },
          size: 's',
        },
      )
      .subscribe(async (route) => {
        if (route === undefined) return; // Dialog dismissed

        let success = false;
        let errorMessage = '';

        if (route === null) {
          // Remove route
          if (!slot.id) return;
          const result = await this.userProfilesService.deletePyramidSlot(
            slot.id,
          );
          success = result.success;
          errorMessage = result.error || 'Error deleting slot';
        } else {
          // Add/Update route
          const result = await this.userProfilesService.updatePyramidSlot({
            user_id: this.userId(),
            year: this.selectedYear(),
            level,
            position,
            route_id: route.id,
          });
          success = result.success;
          errorMessage = result.error || 'Error updating slot';
        }

        if (success) {
          this.slotsResource.reload();
        } else if (errorMessage) {
          this.toast.error(errorMessage);
        }
      });
  }

  goToRoute(
    route: RouteDto & { crag?: { slug: string; area?: { slug: string } } },
  ): void {
    const areaSlug = route.crag?.area?.slug;
    const cragSlug = route.crag?.slug;
    const routeSlug = route.slug;

    if (areaSlug && cragSlug && routeSlug) {
      void this.router.navigate(['/area', areaSlug, cragSlug, routeSlug]);
    }
  }
}
