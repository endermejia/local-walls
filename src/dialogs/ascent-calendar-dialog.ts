import { Component, computed, inject, resource, signal } from '@angular/core';
import { CommonModule, DatePipe, LowerCasePipe } from '@angular/common';
import {
  TuiCalendar,
  TuiMarkerHandler,
  TuiScrollbar,
  TuiIcon,
  TuiLoader,
} from '@taiga-ui/core';
import { TuiDay, TuiBooleanHandler, TuiMonth } from '@taiga-ui/cdk';
import { TuiDialogContext } from '@taiga-ui/experimental';
import { TuiBadge } from '@taiga-ui/kit';
import { TuiHeader } from '@taiga-ui/layout';
import { injectContext } from '@taiga-ui/polymorpheus';
import { TranslatePipe } from '@ngx-translate/core';

import { GlobalData } from '../services/global-data';
import { AscentsService } from '../services/ascents.service';

import {
  AscentType,
  UserAscentStatRecord,
  UserProfileBasicDto,
  RouteAscentWithExtras,
} from '../models';

import { AscentCardComponent } from '../components/ascent-card';

/** Data passed when opening the dialog. */
export interface AscentCalendarDialogData {
  userId: string;
  user?: UserProfileBasicDto;
}

/** Lightweight marker entry from the initial dates-only fetch. */
interface AscentDateMarker {
  date: string;
  type: string;
}

@Component({
  selector: 'app-ascent-calendar-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    LowerCasePipe,
    TuiCalendar,
    TuiScrollbar,
    TuiLoader,
    TranslatePipe,
    TuiIcon,
    TuiHeader,
    TuiBadge,
    AscentCardComponent,
  ],
  template: `
    <div class="flex flex-col gap-0 max-h-[85dvh] -m-4">
      <div
        class="p-2 flex flex-col items-center border-b border-[var(--tui-border-normal)]"
      >
        <tui-calendar
          [value]="selectedDay()"
          [markerHandler]="markerHandler()"
          [disabledItemHandler]="disabledItemHandler()"
          (dayClick)="onDayClick($event)"
          (monthChange)="onMonthChange($event)"
          class="!max-w-full tui-calendar-compact"
        />
      </div>

      <div class="flex-1 overflow-hidden flex flex-col">
        <header
          tuiHeader
          class="px-3 py-2 flex items-center justify-between border-b border-[var(--tui-border-normal)]"
        >
          <span class="font-bold text-base">
            {{
              selectedDay().toLocalNativeDate()
                | date: 'longDate' : undefined : global.selectedLanguage()
            }}
          </span>
          <tui-badge appearance="neutral" size="s" class="font-bold opacity-60">
            {{ ascentsForSelectedDay().length }}
            {{ 'ascents' | translate | lowercase }}
          </tui-badge>
        </header>

        <tui-scrollbar class="flex-1">
          <div class="flex flex-col gap-2 p-3">
            @if (monthResource.isLoading()) {
              <div class="py-12 flex justify-center">
                <tui-loader />
              </div>
            } @else {
              @for (ascent of cardDataForSelectedDay(); track ascent.id) {
                <app-ascent-card [data]="ascent" [showUser]="false" />
              } @empty {
                <div
                  class="py-16 text-center flex flex-col items-center gap-2 opacity-30"
                >
                  <tui-icon icon="@tui.calendar" class="text-5xl" />
                  <span class="font-medium">{{
                    'statistics.noData' | translate
                  }}</span>
                </div>
              }
            }
          </div>
        </tui-scrollbar>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class AscentCalendarDialogComponent {
  protected readonly global = inject(GlobalData);
  private readonly ascentsService = inject(AscentsService);
  protected readonly context =
    injectContext<TuiDialogContext<void, AscentCalendarDialogData>>();

  private readonly userId = this.context.data.userId;
  private readonly user = this.context.data.user ?? null;

  /** Current day selected by the user. Start at today. */
  readonly selectedDay = signal<TuiDay>(TuiDay.currentLocal());

  /** Current month being displayed (drives monthResource). */
  private readonly currentMonth = signal<{ year: number; month: number }>({
    year: TuiDay.currentLocal().year,
    month: TuiDay.currentLocal().month + 1, // 1-based
  });

  // ─── Lightweight all-time dates fetch (for markers) ──────────────────────

  private readonly datesResource = resource<AscentDateMarker[], string>({
    params: () => this.userId,
    loader: ({ params: uid }) => this.ascentsService.getUserAscentDates(uid),
  });

  private readonly datesByKey = computed<Map<string, string[]>>(() => {
    const map = new Map<string, string[]>();
    for (const { date, type } of this.datesResource.value() ?? []) {
      if (!date) continue;
      const key = TuiDay.fromLocalNativeDate(new Date(date)).toString();
      const types = map.get(key) ?? [];
      types.push(type);
      map.set(key, types);
    }
    return map;
  });

  // ─── Per-month full stat fetch (for agenda cards) ────────────────────────

  readonly monthResource = resource<
    UserAscentStatRecord[],
    { year: number; month: number; userId: string }
  >({
    params: () => ({ ...this.currentMonth(), userId: this.userId }),
    loader: ({ params }) =>
      this.ascentsService.getUserAscentsByMonth(
        params.userId,
        params.year,
        params.month,
      ),
  });

  private readonly ascentsByDate = computed<
    Map<string, UserAscentStatRecord[]>
  >(() => {
    const map = new Map<string, UserAscentStatRecord[]>();
    for (const a of this.monthResource.value() ?? []) {
      if (!a.ascent_date) continue;
      const key = TuiDay.fromLocalNativeDate(
        new Date(a.ascent_date),
      ).toString();
      const list = map.get(key) ?? [];
      list.push(a);
      map.set(key, list);
    }
    return map;
  });

  readonly ascentsForSelectedDay = computed<UserAscentStatRecord[]>(
    () => this.ascentsByDate().get(this.selectedDay().toString()) ?? [],
  );

  // ─── Map stat records → RouteAscentWithExtras for ascent-card ────────────

  /** Local display-only shape: only the fields ascent-card actually needs. */
  private buildCardItem(a: UserAscentStatRecord): RouteAscentWithExtras {
    const item: Pick<
      RouteAscentWithExtras,
      | 'id'
      | 'date'
      | 'type'
      | 'grade'
      | 'attempts'
      | 'user_id'
      | 'user'
      | 'route'
    > &
      Partial<RouteAscentWithExtras> = {
      id: a.id,
      date: a.ascent_date,
      type: a.ascent_type as AscentType,
      grade: a.ascent_grade,
      attempts: a.attempts,
      user_id: this.user?.id ?? '',
      user: this.user ?? undefined,
      route: {
        id: 0,
        grade: a.route_grade,
        name: a.route_name,
        slug: a.route_slug,
        liked: false,
        project: false,
        crag_slug: a.crag_slug,
        crag_name: a.crag_name,
        area_slug: a.area_slug,
        area_name: a.area_name,
        crag: {
          id: 0,
          name: a.crag_name,
          slug: a.crag_slug,
          area: {
            id: 0,
            name: a.area_name,
            slug: a.area_slug,
          },
        },
      } as unknown as RouteAscentWithExtras['route'],
    };
    return item as unknown as RouteAscentWithExtras;
  }

  readonly cardDataForSelectedDay = computed<RouteAscentWithExtras[]>(() =>
    this.ascentsForSelectedDay().map((a) => this.buildCardItem(a)),
  );

  // ─── Calendar handlers ────────────────────────────────────────────────────

  // Both handlers are computed signals so TuiCalendar gets a new function
  // reference when datesResource loads, causing it to re-render the markers.
  readonly disabledItemHandler = computed<TuiBooleanHandler<TuiDay>>(() => {
    const map = this.datesByKey();
    return (day: TuiDay): boolean => !map.has(day.toString());
  });

  readonly markerHandler = computed<TuiMarkerHandler>(() => {
    const map = this.datesByKey();
    const colorFn = (t: string) => this.getAscentColor(t);
    return (day: TuiDay): [string] | [string, string] | [] => {
      const types = map.get(day.toString());
      if (!types?.length) return [];
      const colors = Array.from(new Set(types.map(colorFn)));
      return colors.slice(0, 2) as [string] | [string, string];
    };
  });

  onDayClick(day: TuiDay): void {
    this.selectedDay.set(day);
    // If the clicked day is in a different month, switch
    const { year, month: m1 } = this.currentMonth();
    if (day.year !== year || day.month + 1 !== m1) {
      this.currentMonth.set({ year: day.year, month: day.month + 1 });
    }
  }

  onMonthChange(month: TuiMonth): void {
    this.currentMonth.set({ year: month.year, month: month.month + 1 });
  }

  private getAscentColor(type: string): string {
    const t = (type || 'rp') as AscentType;
    return (
      this.ascentsService.ascentInfo()[t]?.background ||
      'var(--tui-status-negative)'
    );
  }
}
