import {
  DecimalPipe,
  isPlatformBrowser,
  Location,
  LowerCasePipe,
} from '@angular/common';
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
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TuiButton, TuiIcon, TuiLoader } from '@taiga-ui/core';
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
  FollowsService,
  GlobalData,
  RoutesService,
  ToastService,
} from '../services';

import { AscentsFeedComponent } from '../components/ascents-feed';
import { ChartAscentsByGradeComponent } from '../components/chart-ascents-by-grade';
import { SectionHeaderComponent } from '../components/section-header';

import { handleErrorToast } from '../utils';

@Component({
  selector: 'app-route',
  imports: [
    SectionHeaderComponent,
    TranslatePipe,
    TuiLoader,
    TuiAvatar,

    TuiButton,
    TuiRating,
    DecimalPipe,
    FormsModule,
    AscentsFeedComponent,
    TuiIcon,
    ChartAscentsByGradeComponent,
    LowerCasePipe,
  ],
  template: `
    <section class="w-full max-w-5xl mx-auto p-4">
      @let isAdmin = global.isAdmin();
      @if (route(); as r) {
        <div class="mb-4 flex items-center justify-between gap-2">
          <app-section-header
            class="w-full"
            [title]="r.name"
            [liked]="r.liked"
            (toggleLike)="routesService.toggleRouteLike(r.id, r)"
          >
            @if (global.canEditRoute()) {
              <div actionButtons class="flex gap-2">
                <button
                  size="s"
                  appearance="neutral"
                  iconStart="@tui.square-pen"
                  tuiIconButton
                  type="button"
                  class="!rounded-full"
                  (click.zoneless)="openEditRoute()"
                >
                  {{ 'actions.edit' | translate }}
                </button>
                @if (isAdmin) {
                  <button
                    size="s"
                    appearance="negative"
                    iconStart="@tui.trash"
                    tuiIconButton
                    type="button"
                    class="!rounded-full"
                    (click.zoneless)="deleteRoute()"
                  >
                    {{ 'actions.delete' | translate }}
                  </button>
                }
              </div>
            }
          </app-section-header>
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
                  {{ 'labels.project' | translate }}
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

        <!-- Ascents Section -->
        <div class="mt-6">
          <h2 class="text-2xl font-bold mb-4">
            {{ totalAscents() }}
            {{
              'labels.' + (totalAscents() === 1 ? 'ascent' : 'ascents')
                | translate
                | lowercase
            }}
          </h2>
          <app-ascents-feed
            [ascents]="accumulatedAscents()"
            [isLoading]="isLoading()"
            [hasMore]="hasMore()"
            [showRoute]="false"
            [followedIds]="followedIds()"
            (loadMore)="loadMore()"
            (follow)="onFollow($event)"
            (unfollow)="onUnfollow($event)"
          />
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
  private readonly followsService = inject(FollowsService);
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

  protected readonly accumulatedAscents = signal<RouteAscentWithExtras[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly followedIds = signal<Set<string>>(new Set());

  protected readonly hasMore = computed(() => {
    return this.accumulatedAscents().length < this.totalAscents();
  });

  loadMore() {
    if (this.hasMore() && !this.isLoading()) {
      this.isLoading.set(true);
      this.global.ascentsPage.update((p) => p + 1);
    }
  }

  onFollow(userId: string) {
    this.followedIds.update((s) => {
      const next = new Set(s);
      next.add(userId);
      return next;
    });
  }

  onUnfollow(userId: string) {
    this.followedIds.update((s) => {
      const next = new Set(s);
      next.delete(userId);
      return next;
    });
  }

  protected readonly equippersNames = computed(() =>
    this.equippers()
      .map((e) => e.name)
      .join(', '),
  );

  constructor() {
    const isBrowser = isPlatformBrowser(this.platformId);
    if (isBrowser) {
      void this.followsService
        .getFollowedIds()
        .then((ids) => this.followedIds.set(new Set(ids)));
    }

    effect(() => {
      const aSlug = this.areaSlug();
      const cSlug = this.cragSlug();
      const rSlug = this.routeSlug();

      this.global.resetDataByPage('route');
      this.global.selectedAreaSlug.set(aSlug);
      this.global.selectedCragSlug.set(cSlug);
      this.global.selectedRouteSlug.set(rSlug);
    });

    effect(() => {
      const res = this.global.routeAscentsResource.value();
      if (res) {
        if (this.global.ascentsPage() === 0) {
          this.accumulatedAscents.set(res.items);
        } else {
          this.accumulatedAscents.update((prev: RouteAscentWithExtras[]) => [
            ...prev,
            ...res.items,
          ]);
        }
        this.isLoading.set(false);
      } else if (this.global.routeAscentsResource.error()) {
        this.isLoading.set(false);
      }
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
    );
  }

  onEditAscent(ascent: RouteAscentWithExtras, routeName?: string): void {
    void firstValueFrom(
      this.ascentsService.openAscentForm({
        routeId: ascent.route_id,
        routeName,
        ascentData: ascent,
      }),
    );
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
}
