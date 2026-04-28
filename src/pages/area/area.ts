import { isPlatformBrowser, LowerCasePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
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
  WritableSignal,
} from '@angular/core';

import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiDialogService } from '@taiga-ui/core';
import {
  TUI_CONFIRM,
  TuiAvatar,
  TuiBadgedContent,
  TuiBadgeNotification,
  TuiComboBox,
  TuiChevron,
  type TuiConfirmData,
  TuiDataListWrapper,
} from '@taiga-ui/kit';
import { TuiDataList, TuiDropdown } from '@taiga-ui/core';
import { UserProfileBasicDto } from '../../models/user.model';
import { UserProfilesService } from '../../services/user-profiles.service';
import { AvatarUrlPipe } from '../../pipes';
import {
  TuiAppearance,
  TuiButton,
  TuiIcon,
  TuiLabel,
  TuiLoader,
  TuiScrollbar,
  TuiInput,
  TuiTextfield,
} from '@taiga-ui/core';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import { AreasService } from '../../services/areas.service';
import { CragsService } from '../../services/crags.service';
import { FiltersService } from '../../services/filters.service';
import { GlobalData } from '../../services/global-data';
import { SeoService } from '../../services/seo.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

import { CragCardComponent } from '../../components/crag/crag-card';
import { AreaPaywallDialogComponent } from '../../components/paywall/area-paywall-dialog';
import { ChartRoutesByGradeComponent } from '../../components/charts/chart-routes-by-grade';
import { EmptyStateComponent } from '../../components/ui/empty-state';
import { GradeComponent } from '../../components/ui/avatar-grade';
import { SectionHeaderComponent } from '../../components/ui/section-header';

import { AreaDetail } from '../../models/area.model';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  ClimbingKinds,
  ClimbingKind,
  isGradeRangeOverlap,
  normalizeRoutesByGrade,
  ORDERED_GRADE_VALUES,
} from '../../models';

import { IconSrcPipe } from '../../pipes/icon-src.pipe';
import { handleErrorToast, matchesQuery } from '../../utils';

@Component({
  selector: 'app-area',
  imports: [
    AvatarUrlPipe,
    ChartRoutesByGradeComponent,
    CragCardComponent,
    EmptyStateComponent,
    FormsModule,
    GradeComponent,
    IconSrcPipe,
    LowerCasePipe,
    ReactiveFormsModule,
    RouterLink,
    SectionHeaderComponent,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiBadgedContent,
    TuiBadgeNotification,
    TuiButton,
    TuiChevron,
    TuiComboBox,
    TuiDataList,
    TuiDataListWrapper,
    TuiDropdown,
    TuiIcon,
    TuiInput,
    TuiLabel,
    TuiLoader,
    TuiScrollbar,
    TuiTextfield,
  ],
  template: `
    <tui-scrollbar class="flex grow">
      <section class="w-full max-w-5xl mx-auto p-4">
        @let canEditAsAdmin = global.canEditAsAdmin();
        @if (global.selectedArea(); as area) {
          @let canAreaAdmin = global.areaAdminPermissions()[area.id];
          @let hasPendingRequest =
            global.pendingAdminRequestAreaIds().has(area.id);
          <div class="mb-4">
            <app-section-header
              class="w-full"
              [title]="area.name"
              [liked]="area.liked"
              (toggleLike)="onToggleLike()"
            >
              @if (global.canEditArea()) {
                <div actionButtons class="flex gap-2">
                  <button
                    size="s"
                    appearance="neutral"
                    iconStart="@tui.square-pen"
                    tuiIconButton
                    type="button"
                    class="rounded-full!"
                    (click.zoneless)="openEditArea()"
                  >
                    {{ 'edit' | translate }}
                  </button>
                  @if (canEditAsAdmin) {
                    <button
                      size="s"
                      appearance="negative"
                      iconStart="@tui.trash"
                      tuiIconButton
                      type="button"
                      class="rounded-full!"
                      (click.zoneless)="deleteArea()"
                    >
                      {{ 'delete' | translate }}
                    </button>
                  }
                </div>
              } @else if (
                global.editingMode() &&
                !canEditAsAdmin &&
                !canAreaAdmin &&
                !hasPendingRequest
              ) {
                <div actionButtons class="flex gap-2">
                  <button
                    tuiButton
                    size="s"
                    appearance="secondary"
                    iconStart="@tui.shield-alert"
                    type="button"
                    class="rounded-full!"
                    (click.zoneless)="requestAdmin()"
                  >
                    {{ 'adminRequests.button' | translate }}
                  </button>
                </div>
              }
              @if (!isPublic()) {
                <tui-icon icon="@tui.lock" />
              }
            </app-section-header>
          </div>

          <div class="mb-4 flex flex-wrap justify-between items-center gap-2">
            <div class="flex gap-2">
              <button
                tuiButton
                appearance="flat"
                size="m"
                type="button"
                (click.zoneless)="viewOnMap()"
                [iconStart]="'@tui.map-pin'"
              >
                {{ 'viewOnMap' | translate }}
              </button>

              @if (hasTopos()) {
                @let details = areaDetail();
                @let hasAccess =
                  canEditAsAdmin ||
                  canAreaAdmin ||
                  details?.is_public ||
                  details?.purchased;

                @if (hasAccess) {
                  <button
                    tuiButton
                    appearance="flat"
                    size="m"
                    type="button"
                    (click.zoneless)="viewFirstTopo()"
                    [iconStart]="'/image/topo.svg'"
                  >
                    {{ 'topos' | translate }}
                  </button>
                } @else if (!areaDetailResource.isLoading()) {
                  <div class="flex flex-col gap-2">
                    <button
                      tuiButton
                      appearance="accent"
                      size="m"
                      type="button"
                      (click.zoneless)="buyTopo()"
                      [iconStart]="'@tui.hand-heart'"
                    >
                      {{ 'payments.getTopos' | translate }}
                    </button>
                    <a
                      routerLink="/merchandising"
                      fragment="packs"
                      class="text-[10px] opacity-60 hover:opacity-100 hover:text-indigo-400 text-center no-underline transition-all font-bold uppercase tracking-wider"
                    >
                      {{ 'merchandising.packs.subtitle' | translate }}
                    </a>
                  </div>
                }
              }
            </div>
            <app-chart-routes-by-grade [grades]="area.grades" />
          </div>

          @let admins = areaAdmins();
          @if (admins.length > 0 || canEditAsAdmin) {
            <div class="flex flex-col gap-3 mb-8">
              <span
                class="text-xs uppercase opacity-60 font-semibold tracking-wider"
              >
                {{ 'admins' | translate }}
              </span>
              <div class="flex flex-wrap gap-4 items-center">
                @for (admin of admins; track admin.user_id) {
                  <a
                    [routerLink]="['/profile', admin.user_id]"
                    class="flex items-center gap-2 bg-(--tui-background-neutral-1) py-1 pr-3 rounded-full border border-(--tui-border-normal) group transition-all hover:bg-(--tui-background-neutral-1-hover) cursor-pointer no-underline text-inherit"
                    [class.pl-1]="admin.user.avatar"
                    [class.pl-3]="!admin.user.avatar"
                  >
                    @if (admin.user.avatar) {
                      <span tuiAvatar size="s">
                        <img
                          [src]="admin.user.avatar | avatarUrl"
                          [alt]="admin.user.name"
                        />
                      </span>
                    }
                    <span class="text-sm font-medium">{{
                      admin.user.name
                    }}</span>
                    @if (canEditAsAdmin) {
                      <button
                        tuiIconButton
                        appearance="flat"
                        size="xs"
                        type="button"
                        iconStart="@tui.x"
                        [attr.aria-label]="'delete' | translate"
                        class="opacity-0 group-hover:opacity-50 hover:opacity-100! transition-opacity -mr-1"
                        (click.zoneless)="
                          $event.stopPropagation(); removeAdmin(admin.user_id)
                        "
                      ></button>
                    }
                  </a>
                }

                @if (canEditAsAdmin) {
                  <div class="w-64">
                    <tui-textfield
                      size="s"
                      tuiChevron
                      [tuiTextfieldCleaner]="true"
                      [stringify]="stringifyUser"
                      class="rounded-full!"
                    >
                      <label tuiLabel for="admin-search-input">{{
                        'addUser' | translate
                      }}</label>
                      <input
                        id="admin-search-input"
                        tuiComboBox
                        [placeholder]="'searchPlaceholder' | translate"
                        (ngModelChange)="onAdminSelected($event)"
                        [ngModel]="null"
                        (input.zoneless)="
                          userSearchQuery.set(adminSearchInput.value)
                        "
                        #adminSearchInput
                      />
                      <tui-data-list-wrapper
                        *tuiDropdown
                        [items]="foundUsers()"
                      />
                    </tui-textfield>
                  </div>
                }
              </div>
            </div>
          }

          <div class="flex items-center justify-between gap-2 mt-4">
            <div class="flex items-center w-full sm:w-auto gap-2">
              <span
                [tuiAvatar]="'crag' | iconSrc"
                tuiThumbnail
                size="l"
                class="self-center"
                [attr.aria-label]="'crag' | translate"
              ></span>
              <h2 class="text-2xl font-semibold">
                {{ cragsCount() }}
                {{
                  (cragsCount() === 1 ? 'crag' : 'crags')
                    | translate
                    | lowercase
                }}
              </h2>
            </div>
            <div class="flex gap-2 flex-wrap sm:flex-nowrap justify-end">
              @if (canEditAsAdmin || canAreaAdmin) {
                <button
                  tuiButton
                  appearance="textfield"
                  size="s"
                  type="button"
                  (click.zoneless)="cragsService.openUnifyCrags()"
                  [iconStart]="'@tui.blend'"
                >
                  {{ 'unify' | translate }}
                </button>
              }
              <button
                tuiButton
                appearance="textfield"
                size="s"
                type="button"
                (click.zoneless)="openCreateCrag()"
                [iconStart]="'@tui.plus'"
              >
                {{ 'new' | translate }}
              </button>
              @if (canEditAsAdmin) {
                <button
                  tuiButton
                  appearance="textfield"
                  size="s"
                  type="button"
                  (click.zoneless)="onSync8a()"
                  [iconStart]="'@tui.refresh-ccw'"
                  [disabled]="areas.loading()"
                >
                  {{ 'import8a.button' | translate }}
                </button>
              }
            </div>
          </div>

          <div class="sticky top-0 z-10 py-4 flex items-end gap-2">
            <tui-textfield
              class="grow block bg-(--tui-background-base)"
              tuiTextfieldSize="l"
            >
              <label tuiLabel for="crags-search">{{
                'searchPlaceholder' | translate
              }}</label>
              <input
                tuiInput
                #cragsSearch
                id="crags-search"
                autocomplete="off"
                [value]="query()"
                (input.zoneless)="onQuery(cragsSearch.value)"
              />
            </tui-textfield>
            <tui-badged-content class="bg-(--tui-background-base) rounded-2xl">
              @if (hasActiveFilters()) {
                <tui-badge-notification
                  tuiAppearance="accent"
                  size="s"
                  tuiSlot="top"
                />
              }
              <button
                tuiButton
                appearance="textfield"
                size="l"
                type="button"
                iconStart="@tui.sliders-horizontal"
                [attr.aria-label]="'filters' | translate"
                (click.zoneless)="openFilters()"
              ></button>
            </tui-badged-content>
          </div>

          @let routesList = routes();
          @if (routesList.length > 0) {
            <div class="flex items-center w-full sm:w-auto gap-2 mt-4 mb-4">
              <span
                tuiAvatar="@tui.route"
                tuiThumbnail
                size="l"
                class="self-center"
                [attr.aria-label]="'routes' | translate"
              ></span>
              <h2 class="text-2xl font-semibold">
                {{ routesList.length }}
                {{ 'routes' | translate | lowercase }}
              </h2>
            </div>

            <div class="grid gap-2 grid-cols-1 md:grid-cols-2 mb-8">
              @for (route of routesList; track route.id) {
                <button
                  class="p-4 rounded-3xl"
                  tuiAppearance="flat"
                  (click.zoneless)="
                    router.navigate([
                      '/area',
                      area.slug,
                      route.crag.slug,
                      route.slug,
                    ])
                  "
                >
                  <div class="flex items-center gap-3 w-full">
                    <app-grade
                      [grade]="route.grade"
                      [kind]="route.climbing_kind"
                      size="s"
                    />
                    <div class="flex flex-col min-w-0 items-start">
                      <span class="font-bold truncate w-full text-left">
                        {{ route.name }}
                      </span>
                      <span
                        class="text-xs opacity-60 truncate w-full text-left"
                      >
                        {{ route.crag.name }}
                      </span>
                    </div>
                    <tui-icon
                      icon="@tui.chevron-right"
                      class="ml-auto opacity-30"
                    />
                  </div>
                </button>
              }
            </div>
          }

          <div class="grid gap-2 grid-cols-1 md:grid-cols-2">
            @for (crag of crags(); track crag.slug) {
              <app-crag-card
                [crag]="{ ...crag, area_slug: areaSlug() }"
                [showAreaName]="false"
              />
            } @empty {
              @if (routesList.length === 0) {
                <app-empty-state
                  class="col-span-full"
                  icon="@tui.layout-grid"
                />
              }
            }
          </div>
        } @else {
          <div class="flex items-center justify-center py-16">
            <tui-loader size="xxl" />
          </div>
        }
      </section>
    </tui-scrollbar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow min-h-0' },
})
export class AreaComponent {
  protected readonly global = inject(GlobalData);
  protected readonly router = inject(Router);
  protected readonly toast = inject(ToastService);
  protected readonly platformId = inject(PLATFORM_ID);
  protected readonly areas = inject(AreasService);
  protected readonly cragsService = inject(CragsService);
  protected readonly supabase = inject(SupabaseService);
  protected readonly dialogs = inject(TuiDialogService);
  protected readonly translate = inject(TranslateService);
  protected readonly filtersService = inject(FiltersService);
  private readonly seo = inject(SeoService);
  protected readonly userProfiles = inject(UserProfilesService);

  areaSlug: InputSignal<string> = input.required<string>();
  readonly query: WritableSignal<string> = signal('');
  protected readonly userSearchQuery = signal('');
  readonly selectedGradeRange = this.global.areaListGradeRange;
  readonly selectedCategories = this.global.areaListCategories;
  readonly selectedShade = this.global.areaListShade;

  readonly hasActiveFilters = computed(() => {
    const [lo, hi] = this.selectedGradeRange();
    const gradeActive = !(lo === 0 && hi === ORDERED_GRADE_VALUES.length - 1);
    return (
      gradeActive ||
      this.selectedCategories().length > 0 ||
      this.selectedShade().length > 0
    );
  });

  protected readonly hasTopos = computed(() => {
    return (this.global.selectedArea()?.topos_count ?? 0) > 0;
  });

  protected readonly areaDetailResource = resource({
    params: () => this.global.selectedArea()?.id,
    loader: async ({ params: id }) => {
      if (!id) return null;
      const { data } = await this.areas.getById(id);
      return data as AreaDetail | null;
    },
  });

  protected readonly areaDetail = computed(() =>
    this.areaDetailResource.value(),
  );

  protected readonly canEditAsAdmin = computed(() =>
    this.global.canEditAsAdmin(),
  );

  protected readonly canEditArea = computed(() => this.global.canEditArea());

  protected readonly isPublic = computed(
    () => this.areaDetail()?.is_public ?? true,
  );

  protected readonly routesResource = resource({
    params: () => {
      const q = this.query().trim();
      const area = this.global.selectedArea();
      if (q.length >= 3 && area) {
        return { q, areaId: area.id };
      }
      return null;
    },
    loader: async ({ params }) => {
      if (!params) return [];
      await this.supabase.whenReady();
      const { data, error } = await this.supabase.client
        .from('routes')
        .select(
          `
          id,
          name,
          slug,
          grade,
          climbing_kind,
          crag:crags!inner(id, name, slug)
        `,
        )
        .eq('crags.area_id', params.areaId)
        .ilike('name', `%${params.q}%`)
        .limit(20);

      if (error) {
        console.error('[AreaComponent] Error searching routes:', error);
        return [];
      }
      return data as unknown as {
        id: number;
        name: string;
        slug: string;
        grade: number;
        climbing_kind: ClimbingKind;
        crag: { id: number; name: string; slug: string };
      }[];
    },
  });

  protected readonly routes = computed(() => this.routesResource.value() ?? []);

  readonly filteredCrags = computed(() => {
    const query = this.query();
    const [minIdx, maxIdx] = this.selectedGradeRange();
    const list = this.global.cragsList();

    const textMatches = (c: (typeof list)[number]) =>
      matchesQuery(c.name, query) || matchesQuery(c.slug, query);

    const gradeMatches = (c: (typeof list)[number]) => {
      const grades = normalizeRoutesByGrade(c.grades);
      return isGradeRangeOverlap(grades, minIdx, maxIdx);
    };

    const categories = this.selectedCategories();
    const kindMatches = (c: (typeof list)[number]) => {
      if (!categories.length) return true;
      const idxToKind: Record<number, string> = {
        0: ClimbingKinds.SPORT,
        1: ClimbingKinds.BOULDER,
        2: ClimbingKinds.MULTIPITCH,
      };
      const allowedKinds = categories.map((i) => idxToKind[i]).filter(Boolean);
      return c.climbing_kind?.some((k) => allowedKinds.includes(k));
    };

    const shadeKeys = this.selectedShade();
    const shadeMatches = (c: (typeof list)[number]) => {
      if (!shadeKeys.length) return true;
      return shadeKeys.some((key) => {
        switch (key) {
          case 'shade_morning':
            return c.shade_morning;
          case 'shade_afternoon':
            return c.shade_afternoon;
          case 'shade_all_day':
            return c.shade_all_day;
          case 'sun_all_day':
            return c.sun_all_day;
          default:
            return true;
        }
      });
    };

    return list.filter(
      (c) =>
        textMatches(c) && gradeMatches(c) && kindMatches(c) && shadeMatches(c),
    );
  });

  protected readonly crags = computed(() => this.filteredCrags());
  protected readonly cragsCount = computed(() => this.filteredCrags().length);
  protected readonly areaToposCount = computed(() =>
    this.crags().reduce((acc, c) => acc + (c.topos_count || 0), 0),
  );

  protected readonly areaAdminsResource = resource({
    params: () => this.global.selectedArea()?.id,
    loader: async ({ params: areaId }) => {
      if (!areaId) return [];
      await this.supabase.whenReady();

      const { data: mappings, error: mappingError } = await this.supabase.client
        .from('area_admins')
        .select('user_id')
        .eq('area_id', areaId);

      if (mappingError || !mappings?.length) {
        if (mappingError) {
          console.error(
            '[AreaComponent] Error fetching area admin mappings:',
            mappingError,
          );
        }
        return [];
      }

      const userIds = mappings.map((m) => m.user_id);
      const { data: profiles, error: profilesError } =
        await this.supabase.client
          .from('user_profiles')
          .select('id, name, avatar')
          .in('id', userIds);

      if (profilesError) {
        console.error(
          '[AreaComponent] Error fetching admin profiles:',
          profilesError,
        );
        return [];
      }

      return mappings.map((m) => ({
        user_id: m.user_id,
        user: profiles.find((p) => p.id === m.user_id) || {
          id: m.user_id,
          name: 'Unknown',
          avatar: null,
        },
      }));
    },
  });

  protected readonly areaAdmins = computed(
    () => this.areaAdminsResource.value() ?? [],
  );

  protected readonly foundUsersResource = resource({
    params: () => this.userSearchQuery().trim(),
    loader: async ({ params: query }) => {
      if (query.length < 2) return [];
      return await this.userProfiles.searchUsers(query);
    },
  });

  protected readonly foundUsers = computed(
    () => this.foundUsersResource.value() ?? [],
  );

  protected readonly stringifyUser = (u: UserProfileBasicDto) => u.name || '';

  async addAdmin(user: UserProfileBasicDto): Promise<void> {
    const areaId = this.global.selectedArea()?.id;
    if (!areaId) return;

    const { error } = await this.supabase.client
      .from('area_admins')
      .insert({ area_id: areaId, user_id: user.id });

    if (error) {
      if (error.code === '23505') {
        this.toast.info('adminRequests.alreadyRequested');
      } else {
        console.error('[AreaComponent] Error adding admin:', error);
        this.toast.error('errors.unexpected');
      }
      return;
    }

    this.toast.success('messages.toasts.adminAdded');
    this.areaAdminsResource.reload();
    this.userSearchQuery.set('');
  }

  async removeAdmin(userId: string): Promise<void> {
    const areaId = this.global.selectedArea()?.id;
    if (!areaId) return;

    const { error } = await this.supabase.client
      .from('area_admins')
      .delete()
      .eq('area_id', areaId)
      .eq('user_id', userId);

    if (error) {
      console.error('[AreaComponent] Error removing admin:', error);
      this.toast.error('errors.unexpected');
      return;
    }

    this.toast.success('messages.toasts.adminRemoved');
    this.areaAdminsResource.reload();
  }

  protected onAdminSelected(user: UserProfileBasicDto | null): void {
    if (user) {
      void this.addAdmin(user);
    }
  }

  constructor() {
    effect(() => {
      const slug = this.areaSlug();
      this.global.resetDataByPage('area');
      this.global.selectedAreaSlug.set(slug);
    });

    // Update SEO tags when the area data is available
    effect(() => {
      const area = this.global.selectedArea();
      const slug = this.areaSlug();
      if (!area) return;
      const cragsCount = this.filteredCrags().length;
      const description = this.translate.instant('seo.description');
      this.seo.setPage({
        title: area.name,
        description: `${area.name} – ${cragsCount} ${this.translate.instant('crags').toLowerCase()}. ${description}`,
        canonicalUrl: `https://climbeast.com/area/${slug}`,
      });
    });
  }

  onQuery(v: string) {
    this.query.set(v);
  }

  openFilters(): void {
    this.filtersService.openFilters();
  }

  onToggleLike(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const area = this.global.selectedArea();
    if (!area) return;
    void this.areas.toggleAreaLike(area.id);
  }

  async deleteArea(): Promise<void> {
    const area = this.global.selectedArea();
    if (!area) return;
    if (!isPlatformBrowser(this.platformId)) return;

    const t = await firstValueFrom(
      this.translate.get(['areas.deleteTitle', 'areas.deleteConfirm'], {
        name: area.name,
      }),
    );
    const title = t['areas.deleteTitle'];
    const message = t['areas.deleteConfirm'];

    const data: TuiConfirmData = {
      content: message,
      yes: this.translate.instant('delete'),
      no: this.translate.instant('cancel'),
      appearance: 'accent',
    };

    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: title,
        size: 's',
        data,
      }),
      { defaultValue: false },
    );
    if (!confirmed) return;
    try {
      await this.areas.delete(area.id);
      await this.router.navigateByUrl('/area');
    } catch (e) {
      const error = e as Error;
      console.error('[AreaComponent] Error deleting area:', error);
      handleErrorToast(error, this.toast);
    }
  }

  openEditArea(): void {
    const area = this.global.selectedArea();
    if (!area) return;
    this.areas.openAreaForm({
      areaData: { id: area.id, name: area.name, slug: area.slug },
    });
  }

  openCreateCrag(): void {
    const current = this.global.selectedArea();
    if (!current) return;
    this.cragsService.openCragForm({ areaId: current.id });
  }

  async onSync8a(): Promise<void> {
    const area = this.global.selectedArea();
    if (!area) return;
    await this.areas.syncAreaWith8a(area.id);
  }

  async viewOnMap(): Promise<void> {
    const area = this.global.selectedArea();
    if (!area) return;

    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('crags')
      .select('latitude, longitude')
      .eq('area_id', area.id)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (error || !data || data.length === 0) {
      void this.router.navigateByUrl('/explore');
      return;
    }

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    data.forEach((c) => {
      if (c.latitude! < minLat) minLat = c.latitude!;
      if (c.latitude! > maxLat) maxLat = c.latitude!;
      if (c.longitude! < minLng) minLng = c.longitude!;
      if (c.longitude! > maxLng) maxLng = c.longitude!;
    });

    this.global.mapBounds.set({
      south_west_latitude: minLat,
      south_west_longitude: minLng,
      north_east_latitude: maxLat,
      north_east_longitude: maxLng,
    });

    void this.router.navigateByUrl('/explore');
  }

  async requestAdmin(): Promise<void> {
    const area = this.global.selectedArea();
    if (!area) return;
    if (!isPlatformBrowser(this.platformId)) return;

    const t = await firstValueFrom(
      this.translate.get([
        'adminRequests.confirmTitle',
        'adminRequests.confirmMessage',
      ]),
    );
    const title = t['adminRequests.confirmTitle'];
    const message = t['adminRequests.confirmMessage'];

    const data: TuiConfirmData = {
      content: message,
      yes: this.translate.instant('accept'),
      no: this.translate.instant('cancel'),
      appearance: 'primary',
    };

    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: title,
        size: 's',
        data,
      }),
      { defaultValue: false },
    );

    if (!confirmed) return;

    const success = await this.areas.requestAreaAdmin(area.id);
    if (success) {
      this.global.pendingAdminRequestsResource.reload();
    }
  }

  viewFirstTopo(): void {
    const topos = this.global.areaToposResource.value();
    if (!topos || topos.length === 0) return;
    const area = this.global.selectedArea();
    if (!area) return;

    // Find first topo crag
    const firstTopo = topos[0];
    void this.router.navigate([
      '/area',
      area.slug,
      firstTopo.crag_slug,
      'topo',
      firstTopo.id,
    ]);
  }

  buyTopo(): void {
    const area = this.areaDetail();
    if (!area) return;

    void firstValueFrom(
      this.dialogs.open(new PolymorpheusComponent(AreaPaywallDialogComponent), {
        label: this.translate.instant('payments.buyCount', {
          count: this.areaToposCount(),
        }),
        size: 'l',
        data: {
          areaId: area.id,
          price: area.price,
        },
      }),
    );
  }
}
