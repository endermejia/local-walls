import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  OnDestroy,
  PLATFORM_ID,
  resource,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import {
  TuiButton,
  TuiIcon,
  TuiLoader,
  TuiHint,
  TuiAppearance,
  TuiDialogService,
} from '@taiga-ui/core';
import {
  TuiBadge,
  TuiAvatar,
  TUI_CONFIRM,
  TuiConfirmData,
} from '@taiga-ui/kit';

import { IndoorService } from '../../services/indoor.service';
import { GlobalData } from '../../services/global-data';
import { AscentsService } from '../../services/ascents.service';
import { ToastService } from '../../services/toast.service';
import { GradeComponent } from '../../components/ui/avatar-grade';
import { SectionHeaderComponent } from '../../components/ui/section-header';
import {
  CLIMBING_ICONS,
  GRADE_NUMBER_TO_LABEL,
  VERTICAL_LIFE_GRADES,
} from '../../models';
import { ChartAscentsByGradeComponent } from '../../components/charts/chart-ascents-by-grade';
import { AscentCardComponent } from '../../components/ascent/ascent-card';

@Component({
  selector: 'app-indoor-route',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslatePipe,
    TuiAvatar,
    TuiButton,
    TuiIcon,
    TuiLoader,
    TuiBadge,
    TuiHint,
    TuiAppearance,
    GradeComponent,
    SectionHeaderComponent,
    ChartAscentsByGradeComponent,
    AscentCardComponent,
  ],
  template: `
    <section class="w-full max-w-5xl mx-auto p-4">
      @if (route(); as r) {
        <!-- Section Header -->
        <div class="mb-4 flex items-center justify-between gap-2">
          <app-section-header
            class="w-full"
            [title]="r.name"
            [liked]="false"
            [showLike]="false"
          >
            <app-grade
              [grade]="r.grade || 0"
              [kind]="r.climbing_kind"
              size="l"
              titleInfo
            />
            @if (r.legacy) {
              <span
                tuiBadge
                size="m"
                appearance="neutral"
                class="uppercase text-xs self-center"
                titleInfo
              >
                {{ 'indoor.legacy' | translate }}
              </span>
            }
            @if (canEdit()) {
              <div actionButtons class="flex gap-2">
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
              </div>
            }
          </app-section-header>
        </div>

        <!-- Chart and Stats Grid -->
        <div class="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Left: Actions & Color circle visualizer -->
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
              @if (!ownAscent()) {
                <button
                  tuiButton
                  appearance="primary"
                  size="m"
                  iconStart="@tui.circle-plus"
                  class="w-full"
                  (click.zoneless)="onLogAscent()"
                >
                  {{ 'ascent.new' | translate }}
                </button>
              } @else {
                <div class="flex gap-2 w-full">
                  <button
                    tuiButton
                    [style.background]="ownAscentInfo()?.background"
                    class="text-(--tui-text-primary-on-accent-1)! grow"
                    size="m"
                    (click.zoneless)="onEditAscent(ownAscent())"
                  >
                    <tui-icon [icon]="ownAscentInfo()?.icon || ''" />
                    {{ 'ascentTypes.' + $any(ownAscent()?.type) | translate }}
                  </button>
                  <button
                    tuiIconButton
                    appearance="secondary"
                    size="m"
                    iconStart="@tui.circle-plus"
                    class="rounded-full! shrink-0"
                    [tuiHint]="'ascent.new' | translate"
                    (click.zoneless)="onLogAscent()"
                  >
                    <span class="tui-sr-only">{{
                      'ascent.new' | translate
                    }}</span>
                  </button>
                </div>
              }
            </div>
          </div>

          <!-- Right: Stats -->
          <div class="flex flex-col gap-6 justify-center">
            <div class="flex flex-wrap justify-around gap-6">
              <!-- Climbing Kind -->
              <div class="flex flex-col items-center">
                <span
                  class="text-xs uppercase opacity-60 font-semibold tracking-wider mb-2"
                >
                  {{ 'climbing_kind' | translate }}
                </span>
                <div class="flex items-center gap-2">
                  <span
                    [tuiAvatar]="
                      $any(climbingIcons)[$any(r.climbing_kind)] ||
                      '@tui.mountain'
                    "
                    size="s"
                    appearance="secondary"
                  ></span>
                  <span class="text-xl font-semibold capitalize">
                    {{ 'climbingKinds.' + r.climbing_kind | translate }}
                  </span>
                </div>
              </div>

              <!-- Color -->
              <div class="flex flex-col items-center">
                <span
                  class="text-xs uppercase opacity-60 font-semibold tracking-wider mb-2"
                >
                  {{ 'color' | translate }}
                </span>
                <div class="flex items-center gap-2">
                  @if (r.color) {
                    <span
                      class="w-5 h-5 rounded-full border border-neutral-300 dark:border-neutral-700 block shrink-0"
                      [style.backgroundColor]="r.color"
                    ></span>
                    <span class="text-xl font-semibold">
                      {{ getColorName(r.color) }}
                    </span>
                  } @else {
                    <span class="opacity-50 text-base">-</span>
                  }
                </div>
              </div>
            </div>

            <!-- Equippers -->
            @if (r.equippers && r.equippers.length > 0) {
              <div class="flex flex-col items-center">
                <span
                  class="text-xs uppercase opacity-60 font-semibold tracking-wider mb-1"
                >
                  {{ 'equippers' | translate }}
                </span>
                <div class="flex flex-wrap gap-2 justify-center">
                  @for (e of r.equippers; track e.id) {
                    <button
                      tuiButton
                      appearance="secondary"
                      size="s"
                      class="min-w-fit!"
                      [routerLink]="['/equipper', e.id]"
                    >
                      {{ e.name }}
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Ascents Section -->
        <div class="mt-6 flex flex-col gap-4">
          <h2 class="text-2xl font-bold mb-2">
            {{ ascents().length }}
            {{
              (ascents().length === 1 ? 'ascent' : 'ascents')
                | translate
                | lowercase
            }}
          </h2>

          @if (ascents().length > 0) {
            <div class="grid gap-6 mt-2 grid-cols-1">
              @for (ascent of mappedAscents(); track ascent.id) {
                <app-ascent-card
                  [data]="ascent"
                  [showRoute]="false"
                  [showUser]="true"
                />
              }
            </div>
          }
        </div>
      } @else if (routeResource.isLoading()) {
        <div class="flex justify-center items-center min-h-[50vh]">
          <tui-loader size="xxl" />
        </div>
      } @else {
        <div
          class="flex flex-col items-center justify-center min-h-[50vh] opacity-50"
        >
          <tui-icon icon="@tui.circle-alert" class="text-5xl mb-2" />
          <p class="text-lg font-bold">Route not found</p>
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow overflow-auto' },
})
export class IndoorRouteComponent implements OnDestroy {
  centerSlug = input.required<string>();
  routeSlug = input.required<string>();

  protected readonly indoor = inject(IndoorService);
  protected readonly global = inject(GlobalData);
  protected readonly ascentsService = inject(AscentsService);
  protected readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly dialogs = inject(TuiDialogService);

  protected readonly climbingIcons = CLIMBING_ICONS;

  protected readonly route = computed(() => this.routeResource.value());

  protected readonly mappedAscents = computed(() => {
    const raw = this.ascents();
    const routeVal = this.route();
    if (!routeVal) return [];
    return raw.map((a) => {
      return {
        ...a,
        user: a.user_profile,
        comment: a.notes,
        grade: routeVal.grade,
        route: {
          id: routeVal.id,
          name: routeVal.name,
          climbing_kind: routeVal.climbing_kind,
          grade: routeVal.grade,
          center_name: routeVal.center_name,
          center_slug: routeVal.center_slug,
        },
      } as any;
    });
  });

  protected readonly ownAscentInfo = computed(() => {
    const own = this.ownAscent();
    if (!own) return null;
    const type = own.type || 'default';
    const info = (this.ascentsService.ascentInfo() as any)[type];
    return info || null;
  });

  readonly gradeLabel = computed(() => {
    const grade = this.route()?.grade;
    return grade !== undefined && grade !== null
      ? (GRADE_NUMBER_TO_LABEL[grade as VERTICAL_LIFE_GRADES] ?? '?')
      : '?';
  });

  protected readonly routeResource = resource({
    params: () => ({
      centerSlug: this.centerSlug(),
      routeSlug: this.routeSlug(),
    }),
    loader: ({ params }) =>
      this.indoor.getRouteBySlug(params.centerSlug, params.routeSlug),
  });

  protected readonly ascents = computed(
    () => this.ascentsResource.value() || [],
  );

  protected readonly ascentsResource = resource({
    params: () => this.route()?.id,
    loader: ({ params: id }) =>
      id ? this.indoor.getRouteAscents(id) : Promise.resolve([]),
  });

  protected readonly ownAscent = computed(() => {
    const userId = this.global.userProfile()?.id;
    if (!userId) return null;
    return this.ascents().find((a) => a.user_id === userId) || null;
  });

  protected readonly canEdit = computed(() => {
    const r = this.route();
    if (!r) return false;
    return r.center_id
      ? this.global.indoorAdminPermissions()[r.center_id] || false
      : false;
  });

  constructor() {
    effect(() => {
      const r = this.route();
      if (r) {
        this.global.selectedIndoorCenter.set({
          id: r.center_id,
          name: r.center_name || '',
          slug: r.center_slug || '',
        } as any);
        this.global.selectedIndoorRoute.set(r);
      } else {
        this.global.selectedIndoorCenter.set(null);
        this.global.selectedIndoorRoute.set(null);
      }
    });
  }

  ngOnDestroy(): void {
    this.global.selectedIndoorCenter.set(null);
    this.global.selectedIndoorRoute.set(null);
  }

  async onLogAscent(): Promise<void> {
    const r = this.route();
    if (!r) return;
    const success = await firstValueFrom(
      this.ascentsService.openAscentForm({
        routeId: r.id as any,
        routeName: r.name,
        isIndoor: true,
        climbingKind: r.climbing_kind as any,
        grade: r.grade || undefined,
      }),
      { defaultValue: false },
    );
    if (success) {
      this.ascentsResource.reload();
    }
  }

  async onEditAscent(ascent: any): Promise<void> {
    const r = this.route();
    if (!r) return;
    const success = await firstValueFrom(
      this.ascentsService.openAscentForm({
        ascentData: {
          ...ascent,
          user: ascent.user_profile,
          comment: ascent.notes,
          grade: r.grade,
          route: {
            id: r.id,
            name: r.name,
            climbing_kind: r.climbing_kind,
            grade: r.grade,
            center_name: r.center_name,
            center_slug: r.center_slug,
          },
        } as any,
        routeId: r.id as any,
        routeName: r.name,
        isIndoor: true,
        climbingKind: r.climbing_kind as any,
        grade: r.grade || undefined,
      }),
      { defaultValue: false },
    );
    if (success) {
      this.ascentsResource.reload();
    }
  }

  async onDeleteAscent(ascentId: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    void firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('ascent.deleteTitle'),
        size: 's',
        data: {
          content: this.translate.instant('ascent.deleteConfirm'),
          yes: this.translate.instant('delete'),
          no: this.translate.instant('cancel'),
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    ).then(async (confirmed) => {
      if (!confirmed) return;
      try {
        await this.indoor.deleteRouteAscent(ascentId);
        this.toast.success('ascent.deleteSuccess');
        this.ascentsResource.reload();
      } catch (e) {
        console.error(e);
        this.toast.error('errors.unexpected');
      }
    });
  }

  protected getColorName(colorValue: string): string {
    const colors = [
      { value: '#EF4444', name: 'red' },
      { value: '#3B82F6', name: 'blue' },
      { value: '#F97316', name: 'orange' },
      { value: '#06B6D4', name: 'cyan' },
      { value: '#EAB308', name: 'yellow' },
      { value: '#22C55E', name: 'green' },
      { value: '#EC4899', name: 'pink' },
      { value: '#A855F7', name: 'purple' },
      { value: '#ffffff', name: 'white' },
      { value: '#000000', name: 'black' },
      { value: '#6B7280', name: 'grey' },
      { value: '#84CC16', name: 'lime' },
      { value: '#14B8A6', name: 'teal' },
      { value: '#6366F1', name: 'indigo' },
      { value: '#D946EF', name: 'magenta' },
    ];
    const colorObj = colors.find((c) => c.value === colorValue);
    return colorObj
      ? this.translate.instant('colors.' + colorObj.name)
      : colorValue;
  }

  async openEditRoute(): Promise<void> {
    const r = this.route();
    if (!r) return;
    const success = await this.indoor.openIndoorRouteForm(r.center_id!, r);
    if (success) {
      this.routeResource.reload();
    }
  }

  async deleteRoute(): Promise<void> {
    const r = this.route();
    if (!r || !isPlatformBrowser(this.platformId)) return;

    void firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('routes.deleteTitle'),
        size: 's',
        data: {
          content: this.translate.instant('routes.deleteConfirm', {
            name: r.name || this.translate.instant('route'),
          }),
          yes: this.translate.instant('delete'),
          no: this.translate.instant('cancel'),
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    ).then(async (confirmed) => {
      if (!confirmed) return;
      try {
        await this.indoor.deleteRoute(r.id);
        this.toast.success('routes.deleteSuccess');
        void this.router.navigate(['/indoor', r.center_slug]);
      } catch (e) {
        console.error(e);
        this.toast.error('errors.unexpected');
      }
    });
  }
}
