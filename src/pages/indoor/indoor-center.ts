import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  resource,
  signal,
  computed,
  effect,
  OnDestroy,
  PLATFORM_ID,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import {
  TuiAppearance,
  TuiButton,
  TuiCarousel,
  TuiIcon,
  TuiLoader,
  TuiScrollbar,
  TuiTextfield,
  TuiNotification,
  TuiDialogService,
} from '@taiga-ui/core';
import {
  TuiAvatar,
  TuiTabs,
  TuiComboBox,
  TuiDataListWrapper,
  TuiChevron,
  TUI_CONFIRM,
  TuiConfirmData,
} from '@taiga-ui/kit';
import { AvatarUrlPipe } from '../../pipes/avatar-url.pipe';
import { AscentCardComponent } from '../../components/ascent/ascent-card';
import { UserProfilesService } from '../../services/user-profiles.service';
import { ToastService } from '../../services/toast.service';
import { UserProfileBasicDto } from '../../models';
import { handleErrorToast, mapLocationUrl } from '../../utils';

import {
  CustomCarouselComponent,
  CarouselItem,
} from '../../components/ui/custom-carousel';

import { GlobalData } from '../../services/global-data';
import { IndoorService } from '../../services/indoor.service';
import { SupabaseService } from '../../services/supabase.service';
import { IndoorCenterDto } from '../../models';
import { SectionHeaderComponent } from '../../components/ui/section-header';
import { IndoorVouchersComponent } from '../../components/indoor/indoor-vouchers';
import { IndoorRoutesComponent } from '../../components/indoor/indoor-routes';
import { IndoorToposComponent } from '../../components/indoor/indoor-topos';
import { AnyToSchedulePipe } from '../../pipes/any-to-schedule.pipe';
import { EmptyStateComponent } from '../../components/ui/empty-state';

@Component({
  selector: 'app-indoor-center',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    TuiAppearance,
    TuiAvatar,
    TuiButton,
    TuiIcon,
    TuiLoader,
    TuiScrollbar,
    TuiTabs,
    TuiCarousel,
    TuiTextfield,
    TuiComboBox,
    TuiDataListWrapper,
    TuiChevron,
    TuiNotification,
    RouterLink,
    SectionHeaderComponent,
    IndoorVouchersComponent,
    IndoorRoutesComponent,
    IndoorToposComponent,
    AnyToSchedulePipe,
    CustomCarouselComponent,
    AvatarUrlPipe,
    EmptyStateComponent,
    AscentCardComponent,
  ],
  template: `
    <tui-scrollbar class="flex grow">
      <section class="w-full max-w-5xl mx-auto p-4 flex flex-col min-h-full">
        @if (center(); as c) {
          @let editingMode = global.editingMode();
          <div class="mb-6">
            <app-section-header [title]="c.name" [showLike]="false">
              <span
                titleInfo
                class="flex items-center gap-1 text-sm font-normal text-(--tui-text-secondary) mt-1.5 select-none"
              >
                <tui-icon icon="@tui.map-pin" />
                <span>{{ c.city }}</span>
              </span>

              <div actionButtons class="flex gap-2">
                @if (canEdit()) {
                  <button
                    tuiIconButton
                    size="s"
                    appearance="neutral"
                    iconStart="@tui.square-pen"
                    class="rounded-full!"
                    type="button"
                    (click)="openEditCenter()"
                  >
                    {{ 'edit' | translate }}
                  </button>
                }
                @if (isAdmin()) {
                  <button
                    tuiIconButton
                    size="s"
                    appearance="negative"
                    iconStart="@tui.trash"
                    class="rounded-full!"
                    type="button"
                    [disabled]="!editingMode"
                    (click.zoneless)="deleteCenter()"
                  >
                    {{ 'delete' | translate }}
                  </button>
                }
              </div>
            </app-section-header>
          </div>

          <div class="flex flex-col md:flex-row gap-6">
            <div class="flex flex-col gap-4 grow">
              <!-- Gallery/Avatar -->
              <div
                class="relative rounded-3xl overflow-hidden aspect-video bg-neutral-100 dark:bg-neutral-800"
              >
                @if (carouselItems().length > 0) {
                  <app-custom-carousel
                    [items]="carouselItems()"
                    [(index)]="galleryIndex"
                    [objectCover]="true"
                    class="h-full w-full"
                  />
                } @else {
                  <div class="flex items-center justify-center h-full">
                    <span
                      [tuiAvatar]="
                        supabase.getPublicUrl('indoor-centers', c.avatar_url)
                      "
                      size="xxl"
                      class="rounded-3xl"
                    ></span>
                  </div>
                }
              </div>

              <div class="flex flex-col gap-2">
                <p class="text-lg">{{ c.description }}</p>

                @if (c.latitude && c.longitude) {
                  <div class="flex flex-row flex-wrap gap-2 mt-2">
                    <button
                      tuiButton
                      appearance="flat"
                      size="m"
                      type="button"
                      (click.zoneless)="viewOnMap(c.latitude, c.longitude)"
                      [iconStart]="'@tui.map-pin'"
                    >
                      {{ 'viewOnMap' | translate }}
                    </button>
                    <button
                      appearance="flat"
                      size="m"
                      tuiButton
                      type="button"
                      [iconStart]="'/image/google-maps.svg'"
                      class="[--tui-icon-size:1.25rem]"
                      (click.zoneless)="
                        openExternal(
                          mapLocationUrl({
                            latitude: c.latitude,
                            longitude: c.longitude,
                          })
                        )
                      "
                      [attr.aria-label]="'openGoogleMaps' | translate"
                    >
                      {{ 'openGoogleMaps' | translate }}
                    </button>
                  </div>
                }
              </div>
            </div>

            <!-- Sidebar: Schedule & Vouchers -->
            <div class="flex flex-col gap-6 md:w-80 shrink-0">
              <div
                tuiAppearance="flat-grayscale"
                class="p-4 rounded-3xl flex flex-col gap-4"
              >
                <h3 class="font-bold flex items-center gap-2">
                  <tui-icon icon="@tui.clock" />
                  {{ 'indoor.schedule' | translate }}
                </h3>

                @let schedule = c.schedule | anyToSchedule;
                <div class="flex flex-col gap-1 text-sm">
                  @for (
                    day of [
                      'monday',
                      'tuesday',
                      'wednesday',
                      'thursday',
                      'friday',
                      'saturday',
                      'sunday',
                    ];
                    track day
                  ) {
                    <div
                      class="flex justify-between p-1 px-2.5 rounded-lg transition-all"
                      [class.bg-(--tui-background-accent-1)]="
                        day === currentDay
                      "
                      [class.text-(--tui-text-primary-on-accent-1)]="
                        day === currentDay
                      "
                      [class.font-bold]="day === currentDay"
                    >
                      <span class="capitalize">{{ day | translate }}</span>
                      @let s = schedule.normal[day];
                      <span>{{
                        s?.closed
                          ? ('indoor.closed' | translate)
                          : s?.open && s?.close
                            ? s.open +
                              ' - ' +
                              s.close +
                              (s.open2 && s.close2
                                ? ' / ' + s.open2 + ' - ' + s.close2
                                : '')
                            : '-'
                      }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>

          <!-- Admins Section -->
          @let admins = centerAdmins();
          @if (editingMode && isAdmin()) {
            <div class="flex flex-col gap-3 mt-6">
              <span
                class="text-xs uppercase opacity-60 font-semibold tracking-wider"
              >
                {{ 'admins' | translate }}
              </span>
              <div class="flex flex-wrap gap-4 items-center">
                @for (admin of admins; track admin.user_id) {
                  <div
                    class="flex items-center gap-2 bg-(--tui-background-neutral-1) py-1 pr-3 rounded-full border border-(--tui-border-normal) group transition-all hover:bg-(--tui-background-neutral-1-hover) no-underline text-inherit"
                    [class.pl-1]="admin.user.avatar"
                    [class.pl-3]="!admin.user.avatar"
                  >
                    <a
                      [routerLink]="['/profile', admin.user_id]"
                      class="flex items-center gap-2 no-underline text-inherit cursor-pointer"
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
                    </a>
                    @if (isAdmin() && editingMode) {
                      <button
                        tuiIconButton
                        appearance="flat"
                        size="xs"
                        type="button"
                        iconStart="@tui.x"
                        [attr.aria-label]="'delete' | translate"
                        class="opacity-0 group-hover:opacity-50 hover:opacity-100! transition-opacity -mr-1"
                        (click.zoneless)="removeAdmin(admin.user_id || '')"
                      ></button>
                    }
                  </div>
                }

                @if (isAdmin() && editingMode) {
                  <div class="w-64">
                    <tui-textfield
                      appearance="floating"
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

          @if (c.warning) {
            <div class="mb-4">
              <div tuiNotification appearance="warning" class="rounded-2xl">
                {{ c.warning }}
              </div>
            </div>
          }

          <div class="overflow-x-auto no-scrollbar">
            <tui-tabs [(activeItemIndex)]="activeTabIndex">
              <button tuiTab>{{ 'indoor.routes' | translate }}</button>
              <button tuiTab>{{ 'indoor.topos' | translate }}</button>
              <button tuiTab>{{ 'indoor.ascents' | translate }}</button>
              <button tuiTab>{{ 'indoor.vouchers' | translate }}</button>
            </tui-tabs>
          </div>

          <div class="mt-6">
            @switch (activeTabIndex()) {
              @case (0) {
                <app-indoor-routes [centerId]="c.id" [centerSlug]="c.slug" />
              }
              @case (1) {
                <app-indoor-topos [centerId]="c.id" [centerSlug]="c.slug" />
              }
              @case (2) {
                @if (centerAscentsResource.value(); as ascents) {
                  @if (ascents.length > 0) {
                    <div
                      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                    >
                      @for (ascent of ascents; track ascent.id) {
                        <app-ascent-card
                          [data]="ascent"
                          [showRoute]="true"
                          [showUser]="true"
                        />
                      }
                    </div>
                  } @else {
                    <app-empty-state />
                  }
                } @else if (centerAscentsResource.isLoading()) {
                  <div class="flex items-center justify-center p-8">
                    <tui-loader size="m"></tui-loader>
                  </div>
                }
              }
              @case (3) {
                <app-indoor-vouchers [centerId]="c.id" />
              }
            }
          </div>
        } @else if (centerResource.isLoading()) {
          <div class="flex items-center justify-center w-full min-h-[50vh]">
            <tui-loader size="xxl" />
          </div>
        } @else {
          <div class="text-center p-20">
            <h2 class="text-2xl font-bold">
              {{ 'notFound.title' | translate }}
            </h2>
            <a tuiButton appearance="flat" class="mt-4" routerLink="/home">{{
              'notFound.goHome' | translate
            }}</a>
          </div>
        }
      </section>
    </tui-scrollbar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow min-h-0' },
})
export class IndoorCenterComponent implements OnDestroy {
  slug = input.required<string>();

  protected readonly global = inject(GlobalData);
  protected readonly indoor = inject(IndoorService);
  protected readonly supabase = inject(SupabaseService);
  protected readonly router = inject(Router);
  protected readonly userProfiles = inject(UserProfilesService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly activeTabIndex = signal(0);
  protected readonly galleryIndex = signal(0);

  protected readonly carouselItems = computed<CarouselItem[]>(() => {
    const c = this.center();
    if (!c?.gallery_urls) return [];
    return c.gallery_urls.map((url) => ({
      type: 'image',
      url: this.supabase.getPublicUrl('indoor-assets', url),
    }));
  });

  protected readonly center = computed<IndoorCenterDto | null>(
    () => this.centerResource.value() ?? null,
  );

  protected readonly centerResource = resource<IndoorCenterDto | null, string>({
    params: () => this.slug(),
    loader: ({ params: slug }) => this.indoor.getCenterBySlug(slug),
  });

  protected readonly centerAscentsResource = resource({
    params: () => this.center()?.id,
    loader: ({ params: id }) =>
      id ? this.indoor.getCenterAscents(id) : Promise.resolve([]),
  });

  protected readonly isAdmin = computed(() => {
    return this.global.isAdmin();
  });

  protected readonly canEdit = computed(() => {
    const center = this.center();
    if (!center) return false;
    return this.global.indoorAdminPermissions()[center.id];
  });

  protected async openEditCenter(): Promise<void> {
    const center = this.center();
    if (!center) return;
    const success = await this.indoor.openIndoorCenterForm({
      centerData: center,
    });
    if (success) {
      this.centerResource.reload();
    }
  }

  protected readonly userSearchQuery = signal('');

  protected readonly centerAdminsResource = resource({
    params: () => this.center()?.id,
    loader: async ({ params: centerId }) => {
      if (!centerId) return [];
      await this.supabase.whenReady();

      const { data: mappings, error: mappingError } = await this.supabase.client
        .from('indoor_center_admins')
        .select('user_id')
        .eq('center_id', centerId);

      if (mappingError || !mappings?.length) {
        if (mappingError) {
          console.error(
            '[IndoorCenterComponent] Error fetching center admin mappings:',
            mappingError,
          );
        }
        return [];
      }

      const userIds = mappings
        .map((m) => m.user_id)
        .filter((id): id is string => !!id);
      const { data: profiles, error: profilesError } =
        await this.supabase.client
          .from('user_profiles')
          .select('id, name, avatar')
          .in('id', userIds);

      if (profilesError) {
        console.error(
          '[IndoorCenterComponent] Error fetching admin profiles:',
          profilesError,
        );
        return [];
      }

      return mappings.map((m) => ({
        user_id: m.user_id,
        user: profiles.find((p) => p.id === m.user_id) || {
          id: m.user_id || '',
          name: 'Unknown',
          avatar: null,
        },
      }));
    },
  });

  protected readonly centerAdmins = computed(
    () => this.centerAdminsResource.value() ?? [],
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

  constructor() {
    effect(() => {
      const c = this.center();
      this.global.selectedIndoorCenter.set(c);
    });
  }

  ngOnDestroy(): void {
    this.global.selectedIndoorCenter.set(null);
  }

  async addAdmin(user: UserProfileBasicDto): Promise<void> {
    const centerId = this.center()?.id;
    if (!centerId) return;

    const { error } = await this.supabase.client
      .from('indoor_center_admins')
      .insert({ center_id: centerId, user_id: user.id });

    if (error) {
      if (error.code === '23505') {
        this.toast.info('adminRequests.alreadyRequested');
      } else {
        console.error('[IndoorCenterComponent] Error adding admin:', error);
        this.toast.error('errors.unexpected');
      }
      return;
    }

    this.toast.success('messages.toasts.adminAdded');
    this.centerAdminsResource.reload();
    this.userSearchQuery.set('');
  }

  async removeAdmin(userId: string): Promise<void> {
    const centerId = this.center()?.id;
    if (!centerId) return;

    const { error } = await this.supabase.client
      .from('indoor_center_admins')
      .delete()
      .eq('center_id', centerId)
      .eq('user_id', userId);

    if (error) {
      console.error('[IndoorCenterComponent] Error removing admin:', error);
      this.toast.error('errors.unexpected');
      return;
    }

    this.toast.success('messages.toasts.adminRemoved');
    this.centerAdminsResource.reload();
  }

  protected onAdminSelected(user: UserProfileBasicDto | null): void {
    if (user) {
      this.addAdmin(user);
    }
  }

  protected readonly mapLocationUrl = mapLocationUrl;

  async viewOnMap(lat: number, lng: number): Promise<void> {
    this.global.areaListShowIndoor.set(true);
    this.global.mapBounds.set({
      south_west_latitude: lat - 0.005,
      south_west_longitude: lng - 0.005,
      north_east_latitude: lat + 0.005,
      north_east_longitude: lng + 0.005,
    });
    void this.router.navigateByUrl('/explore');
  }

  openExternal(url?: string): void {
    if (!url) return;
    window.open(url, '_blank');
  }

  async deleteCenter(): Promise<void> {
    const c = this.center();
    if (!c) return;
    if (!isPlatformBrowser(this.platformId)) return;

    const t = await firstValueFrom(
      this.translate.get(['indoor.deleteTitle', 'indoor.deleteConfirm'], {
        name: c.name,
      }),
    );
    const title = t['indoor.deleteTitle'];
    const message = t['indoor.deleteConfirm'];
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
      const ok = await this.indoor.deleteCenter(c.id);
      if (ok) {
        await this.router.navigateByUrl('/explore');
      }
    } catch (error) {
      handleErrorToast(error, this.toast);
    }
  }

  protected readonly currentDay = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ][new Date().getDay()];
}
