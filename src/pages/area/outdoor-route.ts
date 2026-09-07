import { DecimalPipe, Location, LowerCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  InputSignal,
  resource,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { TuiDialogService } from '@taiga-ui/core';
import {
  TuiButton,
  TuiIcon,
  TuiLoader,
  TuiHint,
  TuiScrollbar,
} from '@taiga-ui/core';
import {
  TUI_CONFIRM,
  TuiAvatar,
  type TuiConfirmData,
  TuiRating,
} from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import { AscentsService } from '../../services/ascents.service';
import { AuthStateService } from '../../services/auth-state.service';

import { FollowsService } from '../../services/follows.service';
import { OutdoorDataService } from '../../services/outdoor-data.service';
import { ProfileDataService } from '../../services/profile-data.service';
import { RoutesService } from '../../services/routes.service';
import { SeoService } from '../../services/seo.service';
import { ToastService } from '../../services/toast.service';

import { AscentsFeedComponent } from '../../components/ascent/ascents-feed';

import { ChartAscentsByGradeComponent } from '../../components/charts/chart-ascents-by-grade';
import { ChartAscentsByStyleComponent } from '../../components/charts/chart-ascents-by-style';
import { GradeComponent } from '../../components/ui/avatar-grade';
import { SectionHeaderComponent } from '../../components/ui/section-header';

import {
  CLIMBING_ICONS,
  FeedItem,
  RouteAscentWithExtras,
  VERTICAL_LIFE_GRADES,
  GRADE_NUMBER_TO_LABEL,
  PROJECT_GRADE_LABEL,
} from '../../models';

import { handleErrorToast, reactToObservable } from '../../utils';

import { IS_BROWSER } from '../../app/is-browser';

@Component({
  selector: 'app-route',
  imports: [
    AscentsFeedComponent,
    ChartAscentsByGradeComponent,
    ChartAscentsByStyleComponent,
    DecimalPipe,
    FormsModule,
    GradeComponent,
    LowerCasePipe,
    SectionHeaderComponent,
    TranslatePipe,
    TuiAvatar,
    TuiButton,
    TuiHint,
    TuiIcon,
    TuiLoader,
    TuiRating,
    TuiScrollbar,
  ],
  template: `
    <tui-scrollbar class="h-full">
      <section class="w-full max-w-5xl mx-auto p-4">
        @let canEditAsAdmin = authState.canEditAsAdmin();
        @if (route(); as r) {
          <div class="mb-4 flex items-center justify-between gap-2">
            <app-section-header
              class="w-full"
              [title]="r.name"
              [liked]="r.liked"
              (toggleLike)="routesService.toggleRouteLike(r.id, r)"
            >
              <app-grade
                [grade]="r.grade"
                [kind]="r.climbing_kind"
                size="l"
                titleInfo
              />
              @if (authState.canEditRoute()) {
                <div actionButtons class="flex gap-2">
                  @let canAreaAdmin =
                    authState.areaAdminPermissions()[r.area_id ?? -1];
                  <button
                    size="s"
                    appearance="neutral"
                    iconStart="@tui.square-pen"
                    tuiIconButton
                    type="button"
                    class="rounded-full!"
                    (click.zoneless)="openEditRoute()"
                  >
                    {{ 'edit' | translate }}
                  </button>
                  @if (canEditAsAdmin || canAreaAdmin) {
                    <button
                      size="s"
                      appearance="negative"
                      iconStart="@tui.trash"
                      tuiIconButton
                      type="button"
                      class="rounded-full!"
                      (click.zoneless)="deleteRoute()"
                    >
                      {{ 'delete' | translate }}
                    </button>
                  }
                </div>
              }
            </app-section-header>
          </div>

          <!-- Chart and Stats Grid -->
          <div class="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Chart and Actions -->

            <div class="flex flex-col gap-6 items-center w-full">
              <!-- Charts -->
              <div
                class="flex flex-col gap-4 items-center justify-center w-full"
              >
                <app-chart-ascents-by-grade
                  [ascents]="ascents()"
                  [gradeLabel]="gradeLabel()"
                  class="w-full"
                />
                <app-chart-ascents-by-style
                  [ascents]="ascents()"
                  class="w-full"
                />
              </div>
            </div>

            <!-- Stats & Actions (Right Column) -->
            <div class="flex flex-col gap-6">
              <div class="flex flex-wrap justify-around gap-6">
                @if (r.height; as height) {
                  <div class="flex flex-col items-center">
                    <span
                      class="text-xs uppercase opacity-60 font-semibold tracking-wider mb-2"
                    >
                      {{ 'height' | translate }}
                    </span>
                    <div class="flex items-center gap-2">
                      <span
                        [tuiAvatar]="'@tui.arrow-up-right'"
                        size="s"
                        appearance="secondary"
                      ></span>
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
                    {{ 'climbing_kind' | translate }}
                  </span>
                  <div class="flex items-center gap-2">
                    <span
                      [tuiAvatar]="
                        climbingIcons[r.climbing_kind] || '@tui.mountain'
                      "
                      size="s"
                      appearance="secondary"
                    ></span>
                    <span class="text-xl font-semibold">{{
                      'climbingKinds.' + r.climbing_kind | translate
                    }}</span>
                  </div>
                </div>

                <div class="flex flex-col items-center">
                  <span
                    class="text-xs uppercase opacity-60 font-semibold tracking-wider mb-2"
                  >
                    {{ 'rating' | translate }}
                  </span>
                  <div class="flex items-center gap-2">
                    <tui-rating
                      [max]="5"
                      [ngModel]="r.rating || 0"
                      [readOnly]="true"
                      [style.font-size.rem]="1.5"
                    />
                    @if (r.rating; as rating) {
                      <span class="text-xl font-semibold">
                        {{ rating | number: '1.1-1' }}
                      </span>
                    }
                  </div>
                </div>
              </div>

              <!-- Action Buttons -->
              <div
                class="flex flex-col gap-3 justify-center w-full max-w-sm mx-auto"
              >
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
                  <div class="flex gap-2 w-full">
                    <button
                      tuiButton
                      [style.background]="
                        ascentsService.ascentInfo()[
                          r.own_ascent.type || 'default'
                        ].background
                      "
                      class="group relative overflow-hidden text-(--tui-text-primary-on-accent-1)! grow transition-all duration-300"
                      size="m"
                      (click)="onViewAscent(r.own_ascent)"
                    >
                      <!-- Normal State -->
                      <span
                        class="flex items-center gap-2 transition-all duration-300 ease-out group-hover:opacity-0 group-hover:scale-90 group-hover:-translate-y-1"
                      >
                        <tui-icon
                          [icon]="
                            ascentsService.ascentInfo()[
                              r.own_ascent.type || 'default'
                            ].icon
                          "
                        />
                        {{ 'ascentTypes.' + r.own_ascent.type | translate }}
                      </span>

                      <!-- Hover State -->
                      <span
                        class="absolute inset-0 flex items-center justify-center gap-2 opacity-0 scale-90 translate-y-1 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 pointer-events-none"
                      >
                        <tui-icon icon="@tui.eye" />
                        {{ 'ascent.view' | translate }}
                      </span>
                    </button>
                    <button
                      tuiIconButton
                      appearance="secondary"
                      size="m"
                      iconStart="@tui.circle-plus"
                      class="rounded-full! shrink-0"
                      [tuiHint]="'ascent.new' | translate"
                      (click)="onLogAscent()"
                    >
                      <span class="tui-sr-only">{{
                        'ascent.new' | translate
                      }}</span>
                    </button>
                  </div>
                }
                @if (!r.climbed) {
                  <button
                    tuiButton
                    [appearance]="r.project ? 'info' : 'neutral'"
                    size="m"
                    iconStart="@tui.bookmark"
                    (click)="routesService.toggleRouteProject(r.id, r)"
                  >
                    {{ 'project' | translate }}
                  </button>
                }
              </div>

              @if (equippers().length > 0) {
                <div class="flex flex-col items-center">
                  <span
                    class="text-xs uppercase opacity-60 font-semibold tracking-wider mb-1"
                  >
                    {{ 'equippers' | translate }}
                  </span>
                  <div class="flex flex-wrap gap-2 justify-center">
                    @for (e of equippers(); track e.id) {
                      <button
                        tuiButton
                        appearance="secondary"
                        size="s"
                        class="min-w-fit!"
                        (click)="router.navigate(['/equipper', e.id])"
                      >
                        {{ e.name }}
                      </button>
                    }
                  </div>
                </div>
              }

              @if (r.topos && r.topos.length) {
                <div class="flex flex-col items-center">
                  <span
                    class="text-xs uppercase opacity-60 font-semibold tracking-wider mb-2"
                  >
                    {{ (r.topos.length === 1 ? 'topo' : 'topos') | translate }}
                  </span>
                  <div class="flex flex-wrap gap-2 justify-center">
                    @for (t of r.topos; track t.id) {
                      <button
                        tuiButton
                        appearance="secondary"
                        size="s"
                        class="min-w-fit!"
                        (click.zoneless)="
                          router.navigate([
                            '/area',
                            areaSlug(),
                            cragSlug(),
                            'topo',
                            t.id,
                          ])
                        "
                      >
                        {{ t.name }}
                      </button>
                    }
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
                (totalAscents() === 1 ? 'ascent' : 'ascents')
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
              [highlightOwn]="true"
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
    </tui-scrollbar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col min-h-0' },
})
export class OutdoorRouteComponent {
  protected readonly authState = inject(AuthStateService);
  protected readonly outdoorData = inject(OutdoorDataService);
  protected readonly profileData = inject(ProfileDataService);
  private readonly location = inject(Location);
  protected readonly routesService = inject(RoutesService);
  protected readonly ascentsService = inject(AscentsService);
  private readonly followsService = inject(FollowsService);
  protected readonly router = inject(Router);
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly translate = inject(TranslateService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);

  areaSlug: InputSignal<string> = input.required<string>();
  cragSlug: InputSignal<string> = input.required<string>();
  routeSlug: InputSignal<string> = input.required<string>();

  protected readonly route = computed(() =>
    this.outdoorData.routeDetailResource.value(),
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
    () => this.outdoorData.routeAscentsResource.value()?.items ?? [],
  );

  protected readonly totalAscents = computed(
    () => this.outdoorData.routeAscentsResource.value()?.total ?? 0,
  );

  protected readonly accumulatedAscents = signal<FeedItem[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly followedIds = signal<Set<string>>(new Set());

  protected readonly hasMore = computed(() => {
    return this.accumulatedAscents().length < this.totalAscents();
  });

  loadMore() {
    if (this.hasMore() && !this.isLoading()) {
      this.isLoading.set(true);
      this.profileData.ascentsPage.update((p) => p + 1);
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
    effect(() => {
      this.followsService.followChange();
      if (this.isBrowser) {
        void this.followsService
          .getFollowedIds()
          .then((ids) => this.followedIds.set(new Set(ids)));
      }
    });

    effect(() => {
      const aSlug = this.areaSlug();
      const cSlug = this.cragSlug();
      const rSlug = this.routeSlug();

      this.outdoorData.selectRoute(aSlug, cSlug, rSlug);
    });

    effect(() => {
      if (!this.isBrowser) return;
      const areaLoading = this.outdoorData.areasListResource.isLoading();
      const cragLoading = this.outdoorData.cragDetailResource.isLoading();
      const routeLoading = this.outdoorData.routeDetailResource.isLoading();
      if (areaLoading || cragLoading || routeLoading) return;
      const area = this.outdoorData.selectedArea();
      const crag = this.outdoorData.cragDetail();
      const route = this.route();
      if (!area || !crag || !route) {
        this.router.navigateByUrl('/page-not-found');
      }
    });

    // Update SEO tags when route data is available
    effect(() => {
      const r = this.route();
      const area = this.outdoorData.selectedArea();
      const crag = this.outdoorData.selectedCrag();
      const aSlug = this.areaSlug();
      const cSlug = this.cragSlug();
      const rSlug = this.routeSlug();
      if (!r) return;
      const grade = this.gradeLabel();
      const cragName = crag?.name ?? cSlug;
      const areaName = area?.name ?? aSlug;
      const appDescription = this.translate.instant('seo.description');
      const totalAscents = this.totalAscents();
      const description = `${r.name} (${grade}) – ${cragName}, ${areaName}. ${totalAscents} ${this.translate.instant(totalAscents === 1 ? 'ascent' : 'ascents').toLowerCase()}. ${appDescription}`;
      this.seo.setPage({
        title: `${r.name} (${grade}) – ${cragName}`,
        description,
        canonicalUrl: `https://climbeast.com/area/${aSlug}/${cSlug}/${rSlug}`,
      });
    });

    reactToObservable(this.ascentsService.ascentDeleted, (id) => {
      this.accumulatedAscents.update((items) =>
        items.filter((item) => String(item.id) !== String(id)),
      );
      this.outdoorData.routeDetailResource.reload();
    });

    reactToObservable(
      this.ascentsService.ascentUpdated,
      async ({ id, changes }) => {
        const updated = await this.ascentsService.getAscentById(id);
        this.accumulatedAscents.update((items) =>
          items.map((item) =>
            String(item.id) === String(id)
              ? ({
                  ...item,
                  ...(updated || changes),
                  kind: 'ascent',
                } as FeedItem)
              : item,
          ),
        );
        this.outdoorData.routeDetailResource.reload();
      },
    );

    reactToObservable(this.ascentsService.ascentCreated, () => {
      this.profileData.ascentsPage.set(0);
      this.outdoorData.routeAscentsResource.reload();
      this.outdoorData.routeDetailResource.reload();
    });

    effect(() => {
      const res = this.outdoorData.routeAscentsResource.value();
      if (res) {
        const items = res.items.map((i) => ({ ...i, kind: 'ascent' as const }));
        const page = untracked(() => this.profileData.ascentsPage());
        if (page === 0) {
          this.accumulatedAscents.set(items);
        } else {
          this.accumulatedAscents.update((prev) => {
            const existingIds = new Set(prev.map((a) => String(a.id)));
            const newItems = items.filter(
              (item) => !existingIds.has(String(item.id)),
            );
            return [...prev, ...newItems];
          });
        }
        this.isLoading.set(false);
      } else if (this.outdoorData.routeAscentsResource.error()) {
        this.isLoading.set(false);
      }
    });
  }

  readonly gradeLabel = computed(() => {
    const grade = this.route()?.grade;
    return grade !== undefined
      ? (GRADE_NUMBER_TO_LABEL[grade as VERTICAL_LIFE_GRADES] ??
          PROJECT_GRADE_LABEL)
      : PROJECT_GRADE_LABEL;
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
        climbingKind: r.climbing_kind,
      }),
      { defaultValue: undefined },
    );
  }

  onViewAscent(ascent: RouteAscentWithExtras): void {
    this.ascentsService.viewAscent(ascent.id);
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
    if (!r || !this.isBrowser) return;

    void firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('routes.deleteTitle'),
        size: 's',
        data: {
          content: this.translate.instant('routes.deleteConfirm', {
            name: r.name,
          }),
          yes: this.translate.instant('delete'),
          no: this.translate.instant('cancel'),
          appearance: 'primary-destructive',
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    ).then((confirmed) => {
      if (!confirmed) return;
      this.routesService
        .delete(r.id)
        .then(() => this.location.back())
        .catch((err) => handleErrorToast(err, this.toast));
    });
  }
}
