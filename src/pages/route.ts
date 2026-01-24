import { DecimalPipe, isPlatformBrowser, Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  InputSignal,
  PLATFORM_ID,
  resource,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TuiButton, TuiHint, TuiIcon, TuiLoader } from '@taiga-ui/core';
import { TuiDialogService } from '@taiga-ui/experimental';
import {
  TUI_CONFIRM,
  TuiAvatar,
  type TuiConfirmData,
  TuiRating,
} from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import {
  CLIMBING_ICONS,
  RouteAscentWithExtras,
  VERTICAL_LIFE_GRADES,
  VERTICAL_LIFE_TO_LABEL,
} from '../models';

import {
  AscentsService,
  GlobalData,
  RoutesService,
  ToastService,
} from '../services';

import {
  AscentsTableComponent,
  ChartAscentsByGradeComponent,
  SectionHeaderComponent,
} from '../components';

import { handleErrorToast } from '../utils';

@Component({
  selector: 'app-route',
  standalone: true,
  imports: [
    SectionHeaderComponent,
    TranslatePipe,
    TuiLoader,
    TuiAvatar,

    TuiButton,
    TuiHint,
    TuiRating,
    DecimalPipe,
    FormsModule,
    AscentsTableComponent,
    TuiIcon,
    ChartAscentsByGradeComponent,
  ],
  template: `
    <section class="w-full max-w-5xl mx-auto p-4">
      @if (route(); as r) {
        <div class="mb-4 flex items-center justify-between gap-2">
          <app-section-header
            class="w-full"
            [title]="r.name"
            [liked]="r.liked"
            (toggleLike)="routesService.toggleRouteLike(r.id, r)"
          />
          @if (global.isAdmin()) {
            <button
              size="s"
              appearance="neutral"
              iconStart="@tui.square-pen"
              tuiIconButton
              type="button"
              class="!rounded-full"
              [tuiHint]="
                global.isMobile() ? null : ('actions.edit' | translate)
              "
              (click.zoneless)="openEditRoute()"
            >
              {{ 'actions.edit' | translate }}
            </button>
            <button
              size="s"
              appearance="negative"
              iconStart="@tui.trash"
              tuiIconButton
              type="button"
              class="!rounded-full"
              [tuiHint]="
                global.isMobile() ? null : ('actions.delete' | translate)
              "
              (click.zoneless)="deleteRoute()"
            >
              {{ 'actions.delete' | translate }}
            </button>
          }
        </div>

        <!-- Chart and Stats Grid -->
        <div class="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Chart and Actions -->

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <!-- Chart -->
            <div class="flex items-center justify-center">
              <app-chart-ascents-by-grade
                [ascents]="ascents()"
                [gradeLabel]="gradeLabel()"
                class="w-40 h-40"
              />
            </div>

            <!-- Action Buttons -->
            <div class="flex flex-col gap-3 justify-center">
              @if (!r.climbed) {
                <button
                  tuiButton
                  appearance="primary"
                  size="m"
                  iconStart="@tui.circle-plus"
                  (click)="onLogAscent()"
                >
                  {{ 'ascent.new' | translate }}
                </button>
              } @else if (r.own_ascent) {
                <button
                  tuiButton
                  [style.background]="
                    ascentsService.ascentInfo()[r.own_ascent.type || 'default']
                      .background
                  "
                  class="!text-white"
                  size="m"
                  (click)="onEditAscent(r.own_ascent, r.name)"
                >
                  <tui-icon
                    [icon]="
                      ascentsService.ascentInfo()[
                        r.own_ascent.type || 'default'
                      ].icon
                    "
                  />
                  {{ 'ascentTypes.' + r.own_ascent.type | translate }}
                </button>
              }
              @if (!r.climbed) {
                <button
                  tuiButton
                  [appearance]="r.project ? 'primary' : 'secondary'"
                  size="m"
                  iconStart="@tui.bookmark"
                  (click)="routesService.toggleRouteProject(r.id, r)"
                >
                  {{
                    (r.project
                      ? 'actions.project.remove'
                      : 'actions.project.add'
                    ) | translate
                  }}
                </button>
              }
            </div>
          </div>

          <!-- Stats -->
          <div class="flex flex-col gap-6">
            <div class="flex flex-wrap justify-around gap-6">
              @if (r.height; as height) {
                <div class="flex flex-col items-center">
                  <span
                    class="text-xs uppercase opacity-60 font-semibold tracking-wider mb-2"
                  >
                    {{ 'labels.height' | translate }}
                  </span>
                  <div class="flex items-center gap-2">
                    <tui-avatar
                      size="s"
                      appearance="secondary"
                      [src]="'@tui.arrow-up-right'"
                    />
                    <span class="text-xl font-semibold"
                      >{{ height || '--' }}m</span
                    >
                  </div>
                </div>
              }

              <div class="flex flex-col items-center">
                <span
                  class="text-xs uppercase opacity-60 font-semibold tracking-wider mb-2"
                >
                  {{ 'labels.climbing_kind' | translate }}
                </span>
                <div class="flex items-center gap-2">
                  <tui-avatar
                    size="s"
                    appearance="secondary"
                    [src]="climbingIcons[r.climbing_kind] || '@tui.mountain'"
                  />
                  <span class="text-xl font-semibold">{{
                    'climbingKinds.' + r.climbing_kind | translate
                  }}</span>
                </div>
              </div>

              <div class="flex flex-col items-center">
                <span
                  class="text-xs uppercase opacity-60 font-semibold tracking-wider mb-2"
                >
                  {{ 'labels.rating' | translate }}
                </span>
                <div class="flex items-center gap-2">
                  <tui-rating
                    [max]="5"
                    [ngModel]="r.rating || 0"
                    [readOnly]="true"
                    [style.font-size.rem]="0.6"
                  />
                  @if (r.rating; as rating) {
                    <span class="text-xl font-semibold">
                      {{ rating | number: '1.1-1' }}
                    </span>
                  }
                </div>
              </div>
            </div>

            @if (equippers().length > 0) {
              <div class="flex flex-col items-center">
                <span
                  class="text-xs uppercase opacity-60 font-semibold tracking-wider mb-1"
                >
                  {{ 'labels.equippers' | translate }}
                </span>
                <div class="flex items-center gap-2">
                  <tui-avatar
                    size="s"
                    appearance="secondary"
                    src="@tui.hammer"
                  />
                  <span class="text-sm opacity-80 text-center">{{
                    equippersNames()
                  }}</span>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Ascents Table Section -->
        <div class="mt-6">
          <h2 class="text-2xl font-bold mb-4">
            {{ 'labels.ascents' | translate }}
          </h2>
          <div>
            <app-ascents-table
              [data]="ascents()"
              [total]="totalAscents()"
              [page]="global.ascentsPage()"
              [size]="global.ascentsSize()"
              (paginationChange)="global.onAscentsPagination($event)"
              [showRoute]="false"
              (updated)="global.routeAscentsResource.reload()"
              (deleted)="onAscentDeleted($event)"
            />
          </div>
        </div>
      } @else {
        <div class="flex items-center justify-center w-full min-h-[50vh]">
          <tui-loader size="xxl" />
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow overflow-auto' },
})
export class RouteComponent {
  protected readonly global = inject(GlobalData);
  private readonly location = inject(Location);
  protected readonly routesService = inject(RoutesService);
  protected readonly ascentsService = inject(AscentsService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly translate = inject(TranslateService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly toast = inject(ToastService);

  areaSlug: InputSignal<string> = input.required<string>();
  cragSlug: InputSignal<string> = input.required<string>();
  routeSlug: InputSignal<string> = input.required<string>();

  protected readonly route = computed(() =>
    this.global.routeDetailResource.value(),
  );

  protected readonly equippersResource = resource({
    params: () => {
      const r = this.route();
      return r ? { id: r.id, _v: r } : undefined;
    },
    loader: async ({ params }) => {
      if (!params) return [];
      return this.routesService.getRouteEquippers(params.id);
    },
  });

  protected readonly equippers = computed(
    () => this.equippersResource.value() ?? [],
  );

  protected readonly ascents = computed(
    () => this.global.routeAscentsResource.value()?.items ?? [],
  );

  protected readonly totalAscents = computed(
    () => this.global.routeAscentsResource.value()?.total ?? 0,
  );

  protected readonly equippersNames = computed(() =>
    this.equippers()
      .map((e) => e.name)
      .join(', '),
  );

  constructor() {
    effect(() => {
      const aSlug = this.areaSlug();
      const cSlug = this.cragSlug();
      const rSlug = this.routeSlug();

      this.global.resetDataByPage('route');
      this.global.selectedAreaSlug.set(aSlug);
      this.global.selectedCragSlug.set(cSlug);
      this.global.selectedRouteSlug.set(rSlug);
    });
  }

  readonly gradeLabel = computed(() => {
    const grade = this.route()?.grade;
    return grade !== undefined
      ? (VERTICAL_LIFE_TO_LABEL[grade as VERTICAL_LIFE_GRADES] ?? '?')
      : '?';
  });

  readonly climbingIcons = CLIMBING_ICONS;

  onLogAscent(): void {
    const r = this.route();
    if (!r) return;
    void firstValueFrom(
      this.ascentsService.openAscentForm({
        routeId: r.id,
        routeName: r.name,
        grade: r.grade,
      }),
    ).then((success) => {
      if (success) {
        this.global.routeDetailResource.reload();
        this.global.routeAscentsResource.reload();
      }
    });
  }

  onEditAscent(ascent: RouteAscentWithExtras, routeName?: string): void {
    void firstValueFrom(
      this.ascentsService.openAscentForm({
        routeId: ascent.route_id,
        routeName,
        ascentData: ascent,
      }),
    ).then((success) => {
      if (success) {
        this.global.routeDetailResource.reload();
        this.global.routeAscentsResource.reload();
      }
    });
  }

  openEditRoute(): void {
    const r = this.route();
    if (!r) return;
    this.routesService.openRouteForm({
      cragId: r.crag_id,
      routeData: {
        id: r.id,
        crag_id: r.crag_id,
        name: r.name,
        slug: r.slug,
        grade: r.grade,
        climbing_kind: r.climbing_kind,
        height: r.height,
      },
    });
  }

  deleteRoute(): void {
    const r = this.route();
    if (!r || !isPlatformBrowser(this.platformId)) return;

    void firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('routes.deleteTitle'),
        size: 's',
        data: {
          content: this.translate.instant('routes.deleteConfirm', {
            name: r.name,
          }),
          yes: this.translate.instant('actions.delete'),
          no: this.translate.instant('actions.cancel'),
        } as TuiConfirmData,
      }),
    ).then((confirmed) => {
      if (!confirmed) return;
      this.routesService
        .delete(r.id)
        .then(() => this.location.back())
        .catch((err) => handleErrorToast(err, this.toast));
    });
  }

  onAscentDeleted(id: number): void {
    this.global.routeAscentsResource.update((curr) => {
      if (!curr) return { items: [], total: 0 };
      const newItems = curr.items.filter((a) => a.id !== id);
      const deletedCount = curr.items.length - newItems.length;
      return {
        items: newItems,
        total: Math.max(0, curr.total - deletedCount),
      };
    });
  }
}
