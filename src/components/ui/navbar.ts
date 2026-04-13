import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
  effect,
  ChangeDetectorRef,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule, FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { TuiAutoFocus } from '@taiga-ui/cdk';
import { TuiIcon, TuiTitle, TuiCell, TuiInput } from '@taiga-ui/core';
import { TuiAppearance, TuiDataList, TuiDropdown } from '@taiga-ui/core';
import { TuiDialogService } from '@taiga-ui/core';
import { TuiAvatar, TuiSkeleton } from '@taiga-ui/kit';
import {
  TuiPulse,
  TuiBadgedContent,
  TuiBadgeNotification,
} from '@taiga-ui/kit';
import { TuiInputSearch, TUI_INPUT_SEARCH } from '@taiga-ui/layout';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  debounceTime,
  distinctUntilChanged,
  firstValueFrom,
  map,
  startWith,
  switchMap,
} from 'rxjs';

import { AreasService } from '../../services/areas.service';
import { CragsService } from '../../services/crags.service';
import { RoutesService } from '../../services/routes.service';
import { GlobalData } from '../../services/global-data';
import { ScrollService } from '../../services/scroll.service';
import { SearchService } from '../../services/search.service';
import { SearchItem } from '../../models/search-item.model';
import {
  SearchAreaItem,
  SearchCragItem,
  SearchRouteItem,
} from '../../models/search-api.model';
import { GradeLabel, LABEL_TO_VERTICAL_LIFE } from '../../models/grade.model';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { TourService } from '../../services/tour.service';
import { TourStep } from '../../services/tour.service';
import { UserProfilesService } from '../../services/user-profiles.service';

import { ChatDialogComponent } from '../dialogs/chat-dialog';
import { NotificationsDialogComponent } from '../dialogs/notifications-dialog';
import { TourHintComponent } from './tour-hint';
import { MenuOptionsButtonComponent } from './menu-options-button';

@Component({
  selector: 'app-navbar',
  host: {
    class: 'z-100 relative md:w-20 md:h-full md:flex md:items-center',
  },
  providers: [
    {
      provide: TUI_INPUT_SEARCH,
      useFactory: () => {
        const translate = inject(TranslateService);
        return translate.stream('searchPlaceholder').pipe(
          map((placeholder: string) => ({
            popular: '',
            history: '',
            placeholder,
            hotkey: '',
            all: '',
            empty: '',
          })),
        );
      },
    },
  ],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiIcon,
    TuiInputSearch,
    TuiSkeleton,
    TuiInput,
    TuiCell,
    TuiTitle,
    TuiAutoFocus,
    TuiDropdown,
    TuiPulse,
    TourHintComponent,
    TuiDataList,
    TuiBadgedContent,
    TuiBadgeNotification,
    NgOptimizedImage,
    MenuOptionsButtonComponent,
  ],
  template: `
    <aside
      class="w-full md:w-20 md:hover:w-64 md:h-full bg-(--tui-background-base) transition-[width] duration-300 z-100 group flex flex-col border-t md:border xl:border-none border-(--tui-border-normal) md:absolute md:left-0 md:top-0 md:bottom-0 overflow-hidden sm:rounded-2xl"
      ngSkipHydration
    >
      <div
        class="flex md:flex-col justify-between w-full h-full p-2 md:p-4 gap-2 md:gap-4"
      >
        <!-- Desktop Logo -->
        <button
          class="hidden md:block shrink-0 rounded-xl transition-colors cursor-pointer w-fit"
          type="button"
          tuiAppearance="flat-grayscale"
          routerLink="/home"
        >
          <img
            ngSrc="/logo/climbeast-small.svg"
            alt="ClimBeast"
            [style.width.px]="40"
            [style.height.px]="40"
            [class.rounded-full]="loading()"
            width="40"
            height="40"
            [tuiSkeleton]="loading()"
          />
        </button>

        <!-- Navigation Links (Middle) -->
        <nav
          class="w-full flex md:flex-col gap-2 md:gap-4 justify-around md:justify-start overflow-y-auto overflow-x-hidden my-auto"
        >
          <!-- Home -->
          <a
            #home="routerLinkActive"
            routerLink="/home"
            routerLinkActive
            [tuiAppearance]="
              home.isActive ? 'flat-destructive' : 'flat-grayscale'
            "
            [tuiSkeleton]="loading()"
            class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit rounded-xl transition-colors w-fit md:w-full relative group"
            (click)="scrollToTop($event)"
            [attr.aria-label]="'nav.home' | translate"
          >
            <div
              class="absolute inset-0 pointer-events-none"
              [tuiDropdown]="tourHint"
              [tuiDropdownManual]="
                tourService.isActive() && tourService.step() === TourStep.HOME
              "
              tuiDropdownDirection="bottom"
            ></div>
            @if (
              tourService.isActive() && tourService.step() === TourStep.HOME
            ) {
              <tui-pulse />
            }
            <tui-badged-content>
              @if (global.unreadNotificationsCount(); as unreadNotifications) {
                <tui-badge-notification
                  tuiAppearance="accent"
                  size="s"
                  tuiSlot="top"
                >
                  {{ unreadNotifications }}
                </tui-badge-notification>
              }
              <tui-icon
                icon="@tui.home"
                class="transition-transform duration-300"
                [style.color]="
                  home.isActive
                    ? 'var(--tui-text-negative)'
                    : 'var(--tui-text-primary)'
                "
              />
            </tui-badged-content>

            <span
              class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden"
            >
              {{ 'nav.home' | translate }}
            </span>
          </a>

          <!-- Explore -->
          <a
            #explore="routerLinkActive"
            routerLink="/explore"
            routerLinkActive
            [tuiAppearance]="
              explore.isActive ? 'flat-destructive' : 'flat-grayscale'
            "
            [tuiSkeleton]="loading()"
            class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit rounded-xl transition-colors w-fit md:w-full relative"
            [attr.aria-label]="'nav.explore' | translate"
          >
            <div
              class="absolute inset-0 pointer-events-none"
              [tuiDropdown]="tourHint"
              [tuiDropdownManual]="
                tourService.isActive() &&
                tourService.step() === TourStep.EXPLORE
              "
              tuiDropdownDirection="bottom"
            ></div>
            @if (
              tourService.isActive() && tourService.step() === TourStep.EXPLORE
            ) {
              <tui-pulse />
            }
            <tui-icon icon="@tui.map" />
            <span
              class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden"
            >
              {{ 'nav.explore' | translate }}
            </span>
          </a>

          <!-- Messages -->
          <button
            type="button"
            [tuiAppearance]="'flat-grayscale'"
            [tuiSkeleton]="loading()"
            class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit rounded-xl transition-colors w-fit md:w-full cursor-pointer relative group"
            (click)="openChat()"
            [attr.aria-label]="'messages' | translate"
          >
            <tui-badged-content>
              @if (global.unreadMessagesCount(); as unreadMessages) {
                <tui-badge-notification
                  tuiAppearance="accent"
                  size="s"
                  tuiSlot="top"
                >
                  {{ unreadMessages }}
                </tui-badge-notification>
              }
              <tui-icon
                icon="@tui.send"
                class="transition-transform duration-300"
                [style.color]="'var(--tui-text-primary)'"
              />
            </tui-badged-content>
            <span
              class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden"
            >
              {{ 'messages' | translate }}
            </span>
          </button>

          @let showConfig =
            global.canEditAsAdmin() || global.canEditAsAreaAdmin();
          @if (showConfig) {
            <!-- Configuration -->
            <a
              #config="routerLinkActive"
              [routerLink]="global.canEditAsAdmin() ? '/admin' : '/my-areas'"
              routerLinkActive
              [tuiAppearance]="
                config.isActive ? 'flat-destructive' : 'flat-grayscale'
              "
              class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit rounded-xl transition-colors w-fit md:w-full"
              [attr.aria-label]="
                (global.canEditAsAdmin() ? 'config' : 'nav.my-areas')
                  | translate
              "
            >
              <tui-icon icon="@tui.cog" />
              <span
                class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden"
              >
                @if (global.canEditAsAdmin()) {
                  {{ 'config' | translate }}
                } @else {
                  {{ 'nav.my-areas' | translate }}
                }
              </span>
            </a>
          }

          <!-- Search -->
          <div class="flex flex-col gap-2 overflow-hidden flex-none relative">
            <div
              class="absolute inset-0 pointer-events-none"
              [tuiDropdown]="tourHint"
              [tuiDropdownManual]="
                tourService.isActive() && tourService.step() === TourStep.SEARCH
              "
              tuiDropdownDirection="bottom"
            ></div>
            <button
              [tuiAppearance]="
                searchExpanded() ? 'flat-destructive' : 'flat-grayscale'
              "
              [tuiSkeleton]="loading()"
              class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit rounded-xl transition-colors w-fit md:w-full cursor-pointer relative"
              (click)="searchOpen = true"
              [attr.aria-label]="'search' | translate"
            >
              @if (
                tourService.isActive() && tourService.step() === TourStep.SEARCH
              ) {
                <tui-pulse />
              }
              <tui-icon icon="@tui.search" />
              <span
                class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden"
              >
                {{ 'search' | translate }}
              </span>
            </button>
            <div class="hidden">
              <tui-textfield>
                <input
                  #searchInput
                  autocomplete="off"
                  tuiAutoFocus
                  [formControl]="control"
                  [tuiInputSearch]="search"
                  [(tuiInputSearchOpen)]="searchOpen"
                  [placeholder]="'searchPlaceholder' | translate"
                />
                <ng-template #search>
                  <tui-data-list>
                    @for (item of flatResults(); track $index) {
                      <a
                        tuiCell
                        [routerLink]="item.href || null"
                        (click)="onResultClick(item, $event)"
                      >
                        @if (item.type === 'user') {
                          <span tuiAvatar size="xs" class="mr-2">
                            @if (item.icon && !item.icon.startsWith('@tui.')) {
                              <img [src]="item.icon" alt="" />
                            } @else {
                              <tui-icon [icon]="item.icon || '@tui.user'" />
                            }
                          </span>
                        } @else if (item.icon) {
                          <tui-icon [icon]="item.icon" class="mr-2" />
                        }
                        <span tuiTitle>
                          {{ item.title }}
                          @if (item.subtitle) {
                            <span tuiSubtitle>{{ item.subtitle }}</span>
                          }
                        </span>
                      </a>
                    }
                  </tui-data-list>
                </ng-template>
              </tui-textfield>
            </div>
          </div>

          <!-- Profile -->
          <a
            #profile="routerLinkActive"
            routerLink="/profile"
            routerLinkActive
            [tuiAppearance]="
              profile.isActive ? 'flat-destructive' : 'flat-grayscale'
            "
            [tuiSkeleton]="loading()"
            class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit rounded-xl transition-colors w-fit md:w-full lg:mt-auto"
            [attr.aria-label]="'nav.profile' | translate"
          >
            <span
              tuiAvatar
              [tuiSkeleton]="!global.userProfile()"
              [class.ring-2]="profile.isActive"
              [class.ring-offset-2]="profile.isActive"
              [style.--tw-ring-color]="
                profile.isActive ? 'var(--tui-text-negative)' : ''
              "
              size="xs"
            >
              @if (global.userAvatar(); as avatar) {
                <img [src]="avatar" [alt]="global.userProfile()?.name || ''" />
              } @else {
                <tui-icon icon="@tui.user" />
              }
            </span>
            <span
              class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden"
            >
              {{ 'nav.profile' | translate }}
            </span>
          </a>
        </nav>

        <!-- Desktop Bottom Options -->
        <div class="hidden md:block w-full shrink-0">
          <app-menu-options-button
            appearance="flat-grayscale"
            [loading]="loading()"
            direction="top"
          />
        </div>
      </div>
    </aside>

    <ng-template #tourHint>
      <app-tour-hint
        [description]="tourDescription() | translate"
        (next)="onTourNext()"
        (skip)="tourService.finish()"
      />
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  readonly isLoading = input<boolean>(false);
  protected readonly loading = computed(
    () => this.isLoading() || this.global.isNavLoading(),
  );
  protected global = inject(GlobalData);
  protected readonly tourService = inject(TourService);
  protected readonly TourStep = TourStep;
  protected readonly tourDescription = computed(() => {
    const step = this.tourService.step();
    switch (step) {
      case TourStep.EXPLORE:
        return 'tour.explore.description';
      case TourStep.EXPLORE_AREAS:
        return 'tour.explore.areasDescription';
      case TourStep.AREAS:
        return 'tour.areas.description';
      case TourStep.SEARCH:
        return 'tour.search.description';
      case TourStep.HOME:
      default:
        return 'tour.home.description';
    }
  });
  private readonly toast = inject(ToastService);
  private readonly searchService = inject(SearchService);
  private readonly router = inject(Router);
  private readonly scrollService = inject(ScrollService);
  private readonly supabase = inject(SupabaseService);
  private readonly userProfilesService = inject(UserProfilesService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly areasService = inject(AreasService);
  private readonly cragsService = inject(CragsService);
  private readonly routesService = inject(RoutesService);

  protected readonly searchExpanded = signal(false);
  protected readonly control = new FormControl('');
  protected searchOpen = false;

  constructor() {
    const cdr = inject(ChangeDetectorRef);
    effect(() => {
      const step = this.tourService.step();
      if (step === TourStep.SEARCH) {
        // Wait a bit to let the dropdown initialize, then programmatically open and type "Millena"
        setTimeout(() => {
          this.searchOpen = true;
          this.searchExpanded.set(true);
          this.control.setValue('Millena');
          cdr.markForCheck();
        }, 500);
      }
    });
  }

  protected readonly results = toSignal(
    this.control.valueChanges.pipe(
      map((v) => (v ?? '').trim()),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((query) => this.searchService.search(query)),
      startWith(null),
    ),
    { initialValue: null },
  );

  protected readonly flatResults = computed(() => {
    const data = this.results();
    return data ? Object.values(data).flat() : [];
  });

  protected onResultClick(item: SearchItem, event?: Event): void {
    if (item.type?.startsWith('create-') || item.type?.startsWith('import-')) {
      event?.preventDefault();
      event?.stopPropagation();

      const query = (this.control.value || '').trim();

      switch (item.type) {
        case 'create-area':
          this.areasService.openAreaForm({ areaData: { name: query } });
          break;
        case 'create-crag':
          this.cragsService.openCragForm({
            areaId: this.global.selectedArea()?.id,
            cragData: { name: query },
          });
          break;
        case 'create-route':
          this.routesService.openRouteForm({
            cragId: this.global.selectedCrag()?.id,
            routeData: { name: query },
          });
          break;
        case 'import-area': {
          const anuArea = item.data as SearchAreaItem;
          this.areasService.openAreaForm({
            areaData: {
              name: anuArea.areaName,
              slug: anuArea.areaSlug,
              eight_anu_crag_slugs: [anuArea.areaSlug],
            },
          });
          break;
        }
        case 'import-crag': {
          const anuCrag = item.data as SearchCragItem;
          this.cragsService.openCragForm({
            areaId: this.global.selectedArea()?.id,
            cragData: {
              name: anuCrag.cragName,
              slug: anuCrag.cragSlug,
              eight_anu_sector_slugs: [anuCrag.cragSlug],
            },
          });
          break;
        }
        case 'import-route': {
          const anuRoute = item.data as SearchRouteItem;
          this.routesService.openRouteForm({
            cragId: this.global.selectedCrag()?.id,
            routeData: {
              name: anuRoute.zlaggableName,
              slug: anuRoute.zlaggableSlug,
              grade: this.gradeToNumber(anuRoute.difficulty),
              eight_anu_route_slugs: [anuRoute.zlaggableSlug],
            },
          });
          break;
        }
      }
    }

    this.searchOpen = false;
    this.control.setValue('', { emitEvent: false });
  }

  protected gradeToNumber(label: string | undefined): number {
    if (!label) return 0;
    const normalized = label.toLowerCase().replace(' ', '') as GradeLabel;
    return LABEL_TO_VERTICAL_LIFE[normalized] || 0;
  }

  protected scrollToTop(event: MouseEvent): void {
    if (this.router.url === '/home') {
      event.preventDefault();
      this.scrollService.scrollToTop();
    }
  }

  protected onTourNext(): void {
    if (this.tourService.step() === TourStep.SEARCH) {
      this.searchOpen = false;
      this.searchExpanded.set(false);
      this.control.setValue('', { emitEvent: false });
    }
    this.tourService.next();
  }

  protected openChat(): void {
    void firstValueFrom(
      this.dialogs.open(new PolymorpheusComponent(ChatDialogComponent), {
        label: this.translate.instant('messages'),
        size: 'm',
      }),
      { defaultValue: undefined },
    );
  }

  protected openNotifications(): void {
    void firstValueFrom(
      this.dialogs.open(
        new PolymorpheusComponent(NotificationsDialogComponent),
        {
          label: this.translate.instant('notifications'),
          size: 'm',
        },
      ),
      { defaultValue: undefined },
    );
  }
}
