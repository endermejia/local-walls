import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  effect,
  InputSignal,
  PLATFORM_ID,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  isPlatformBrowser,
  Location,
  LowerCasePipe,
  DecimalPipe,
} from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TuiLoader, TuiButton, TuiHint, TuiIcon } from '@taiga-ui/core';
import {
  TuiAvatar,
  TuiRating,
  TUI_CONFIRM,
  type TuiConfirmData,
  TuiToastService,
} from '@taiga-ui/kit';
import { TuiCardLarge, TuiHeader } from '@taiga-ui/layout';
import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { SectionHeaderComponent, AscentsTableComponent } from '../components';
import { GlobalData, RoutesService } from '../services';
import {
  VERTICAL_LIFE_GRADES,
  VERTICAL_LIFE_TO_LABEL,
  colorForGrade,
  GradeLabel,
  ClimbingKinds,
} from '../models';
import { RouteFormComponent } from '../pages/route-form';
import AscentFormComponent from '../pages/ascent-form';
import { handleErrorToast } from '../utils';

@Component({
  selector: 'app-route',
  standalone: true,
  imports: [
    SectionHeaderComponent,
    TranslatePipe,
    TuiLoader,
    TuiAvatar,
    TuiCardLarge,
    TuiHeader,
    TuiButton,
    TuiHint,
    TuiRating,
    DecimalPipe,
    FormsModule,
    AscentsTableComponent,
    TuiIcon,
  ],
  template: `
    <section class="w-full max-w-5xl mx-auto p-4">
      @if (route(); as r) {
        <div class="mb-4 flex items-center justify-between gap-2">
          <app-section-header
            class="w-full"
            [title]="r.name"
            [liked]="r.liked"
            (back)="goBack()"
            (toggleLike)="onToggleLike()"
          />
          @if (global.isAdmin()) {
            <button
              size="s"
              appearance="neutral"
              iconStart="@tui.square-pen"
              tuiIconButton
              type="button"
              class="!rounded-full"
              [tuiHint]="'actions.edit' | translate"
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
              [tuiHint]="'actions.delete' | translate"
              (click.zoneless)="deleteRoute()"
            >
              {{ 'actions.delete' | translate }}
            </button>
          }
        </div>

        <div class="mt-6 grid grid-cols-1 gap-6">
          <!-- Left Column: Details -->
          <div class="flex flex-col gap-4">
            <div tuiCardLarge class="!bg-opacity-50 backdrop-blur-md">
              <div
                class="grid grid-cols-2 md:grid-cols-3 justify-items-center gap-4 mt-4"
              >
                <div class="flex flex-col items-start justify-center">
                  <tui-avatar
                    size="l"
                    class="!text-white font-bold"
                    [style.background]="gradeColor()"
                    [src]="null"
                  >
                    {{ gradeLabel() }}
                  </tui-avatar>
                </div>

                <div class="flex flex-col">
                  <span
                    class="text-xs uppercase opacity-60 font-semibold tracking-wider"
                  >
                    {{ 'labels.height' | translate }}
                  </span>
                  <div class="flex items-center gap-2 mt-1">
                    <tui-avatar
                      size="s"
                      appearance="secondary"
                      [src]="'@tui.arrow-up-right'"
                    />
                    <span class="text-lg font-medium"
                      >{{ r.height || '--' }}m</span
                    >
                  </div>
                </div>

                <div class="flex flex-col">
                  <span
                    class="text-xs uppercase opacity-60 font-semibold tracking-wider"
                  >
                    {{ 'labels.climbing_kind' | translate }}
                  </span>
                  <div class="flex items-center gap-2 mt-1">
                    <tui-avatar
                      size="s"
                      appearance="secondary"
                      [src]="
                        climbingIcons()[r.climbing_kind] || '@tui.mountain'
                      "
                    />
                    <span class="text-lg font-medium">{{
                      'climbingKinds.' + r.climbing_kind | translate
                    }}</span>
                  </div>
                </div>
              </div>

              <div class="mt-8 flex flex-wrap gap-3">
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
                    [appearance]="
                      ascentInfo()[r.own_ascent.type || 'default'].appearance
                    "
                    size="m"
                    (click)="onEditAscent(r.own_ascent)"
                  >
                    <tui-icon
                      [icon]="ascentInfo()[r.own_ascent.type || 'default'].icon"
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
                    (click)="onToggleProject()"
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
          </div>

          <!-- Right Column: Sidebar / Stats (Placeholder for future ratings/ascents) -->
          <div class="flex flex-col gap-4">
            <div tuiCardLarge class="!bg-opacity-50 backdrop-blur-md">
              <div class="flex flex-col items-center justify-center p-6 gap-2">
                <tui-rating
                  [max]="5"
                  [ngModel]="r.rating || 0"
                  [readOnly]="true"
                  class="!text-3xl"
                />
                <span class="text-sm opacity-60">
                  {{
                    r.rating
                      ? (r.rating | number: '1.1-1') + ' / 5'
                      : ('labels.noRatingsYet' | translate)
                  }}
                </span>
              </div>
            </div>

            <div tuiCardLarge class="!bg-opacity-50 backdrop-blur-md">
              <header tuiHeader>
                <h2 tuiTitle>{{ 'labels.ascents' | translate }}</h2>
              </header>
              <div class="mt-4">
                <app-ascents-table
                  [data]="ascents()"
                  [showRoute]="false"
                  (updated)="global.routeAscentsResource.reload()"
                  (deleted)="onAscentDeleted($event)"
                />
              </div>
            </div>
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
  private readonly routesService = inject(RoutesService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly translate = inject(TranslateService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly toast = inject(TuiToastService);

  areaSlug: InputSignal<string> = input.required<string>();
  cragSlug: InputSignal<string> = input.required<string>();
  routeSlug: InputSignal<string> = input.required<string>();

  protected readonly route = computed(() =>
    this.global.routeDetailResource.value(),
  );

  protected readonly ascents = computed(
    () => this.global.routeAscentsResource.value() ?? [],
  );

  constructor() {
    effect(() => {
      const aSlug = this.areaSlug();
      const cSlug = this.cragSlug();
      const rSlug = this.routeSlug();

      this.global.selectedAreaSlug.set(aSlug);
      this.global.selectedCragSlug.set(cSlug);
      this.global.selectedRouteSlug.set(rSlug);
    });
  }

  goBack(): void {
    this.location.back();
  }

  readonly gradeLabel = computed(() => {
    const grade = this.route()?.grade;
    return grade !== undefined
      ? (VERTICAL_LIFE_TO_LABEL[grade as VERTICAL_LIFE_GRADES] ?? '?')
      : '?';
  });

  readonly gradeColor = computed(() => {
    const label = this.gradeLabel();
    return label !== '?'
      ? colorForGrade(label as GradeLabel)
      : 'var(--tui-text-primary)';
  });

  readonly climbingIcons = computed(() => ({
    [ClimbingKinds.SPORT]: '@tui.line-squiggle',
    [ClimbingKinds.BOULDER]: '@tui.biceps-flexed',
    [ClimbingKinds.MIXED]: '@tui.mountain',
    [ClimbingKinds.MULTIPITCH]: '@tui.mountain',
    [ClimbingKinds.TRAD]: '@tui.mountain',
  }));

  onToggleLike(): void {
    const r = this.route();
    if (!r || !isPlatformBrowser(this.platformId)) return;
    void this.routesService.toggleRouteLike(r.id);
  }

  onToggleProject(): void {
    const r = this.route();
    if (!r || !isPlatformBrowser(this.platformId)) return;
    void this.routesService.toggleRouteProject(r.id);
  }

  onLogAscent(): void {
    const r = this.route();
    if (!r) return;
    this.dialogs
      .open(new PolymorpheusComponent(AscentFormComponent), {
        label: this.translate.instant('ascent.new'),
        data: { routeId: r.id, grade: r.grade },
        size: 'm',
      })
      .subscribe();
  }

  onEditAscent(ascent: any): void {
    this.dialogs
      .open(new PolymorpheusComponent(AscentFormComponent), {
        label: this.translate.instant('ascent.edit'),
        data: { routeId: ascent.route_id, ascentData: ascent },
        size: 'm',
      })
      .subscribe();
  }

  protected readonly ascentInfo = computed<
    Record<string, { icon: string; appearance: string }>
  >(() => ({
    os: {
      icon: '@tui.eye',
      appearance: 'success',
    },
    f: {
      icon: '@tui.zap',
      appearance: 'warning',
    },
    rp: {
      icon: '@tui.circle',
      appearance: 'negative',
    },
    default: {
      icon: '@tui.circle',
      appearance: 'neutral',
    },
  }));

  openEditRoute(): void {
    const r = this.route();
    if (!r) return;
    this.dialogs
      .open<boolean>(new PolymorpheusComponent(RouteFormComponent), {
        label: this.translate.instant('routes.editTitle'),
        size: 'l',
        data: {
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
        },
      })
      .subscribe();
  }

  deleteRoute(): void {
    const r = this.route();
    if (!r || !isPlatformBrowser(this.platformId)) return;

    this.dialogs
      .open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('routes.deleteTitle'),
        size: 's',
        data: {
          content: this.translate.instant('routes.deleteConfirm', {
            name: r.name,
          }),
          yes: this.translate.instant('actions.delete'),
          no: this.translate.instant('actions.cancel'),
        } as TuiConfirmData,
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.routesService
          .delete(r.id)
          .then(() => this.goBack())
          .catch((err) => handleErrorToast(err, this.toast, this.translate));
      });
  }

  onAscentDeleted(id: number): void {
    this.global.routeAscentsResource.update((curr) =>
      (curr ?? []).filter((a) => a.id !== id),
    );
  }
}
