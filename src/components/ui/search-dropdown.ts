import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { TuiAutoFocus } from '@taiga-ui/cdk';
import {
  TuiDataList,
  TuiDropdown,
  TuiIcon,
  TuiScrollbar,
  TuiTextfield,
  TuiTitle,
} from '@taiga-ui/core';
import {
  TuiAvatar,
  TuiBadge,
  TuiPulse,
  TuiSkeleton,
  TuiTab,
  TuiTabs,
} from '@taiga-ui/kit';
import { TUI_INPUT_SEARCH, TuiInputSearch } from '@taiga-ui/layout';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs';

import { AreasService } from '../../services/areas.service';
import { CragsService } from '../../services/crags.service';
import { OutdoorDataService } from '../../services/outdoor-data.service';
import { RoutesService } from '../../services/routes.service';
import { SearchService } from '../../services/search.service';
import { TourService, TourStep } from '../../services/tour.service';

import {
  SearchAreaItem,
  SearchCragItem,
  SearchData,
  SearchItem,
  SearchRouteItem,
} from '../../models';

import { gradeToNumber } from '../../utils';

import { GradeComponent } from './avatar-grade';
import { TourHintComponent } from './tour-hint';

@Component({
  selector: 'app-search-dropdown',
  imports: [
    FormsModule,
    GradeComponent,
    NgTemplateOutlet,
    ReactiveFormsModule,
    RouterLink,
    TourHintComponent,
    TranslatePipe,
    TuiAutoFocus,
    TuiAvatar,
    TuiBadge,
    TuiDataList,
    TuiDropdown,
    TuiIcon,
    TuiInputSearch,
    TuiPulse,
    TuiScrollbar,
    TuiSkeleton,
    TuiTab,
    TuiTabs,
    TuiTextfield,
    TuiTitle,
  ],
  providers: [
    {
      provide: TUI_INPUT_SEARCH,
      useFactory: () => {
        const translate = inject(TranslateService);
        return toSignal(
          translate.stream('searchPlaceholder').pipe(
            map((placeholder: string) => ({
              popular: '',
              history: '',
              placeholder,
              hotkey: '',
              all: '',
              empty: '',
            })),
          ),
          {
            initialValue: {
              popular: '',
              history: '',
              placeholder: '',
              hotkey: '',
              all: '',
              empty: '',
            },
          },
        );
      },
    },
  ],
  template: `
    <div class="flex flex-col gap-2 overflow-hidden flex-none relative">
      <button
        tuiAppearance="flat-grayscale"
        [tuiSkeleton]="loading()"
        class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit rounded-xl transition-colors w-fit md:w-full cursor-pointer relative group"
        (click)="searchOpen.set(true)"
        [attr.aria-label]="'search' | translate"
      >
        @if (tourService.isActive() && tourService.step() === TourStep.SEARCH) {
          <span
            class="absolute bottom-2 left-2 pointer-events-none z-10 size-0"
          >
            <tui-pulse />
          </span>
        }
        <tui-icon
          icon="@tui.search"
          [style.color]="
            searchOpen()
              ? 'var(--tui-text-negative)'
              : 'var(--tui-text-primary)'
          "
        />
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
            [value]="searchValue()"
            (input)="searchValue.set(toValue($event))"
            [tuiInputSearch]="searchContent"
            [(tuiInputSearchOpen)]="searchOpen"
            [placeholder]="'searchPlaceholder' | translate"
          />
          <ng-template #searchContent>
            @if (results() !== null) {
              <div
                class="flex flex-col h-full bg-(--tui-background-base) rounded-xl overflow-hidden w-[calc(100vw-1rem)] md:w-auto md:min-w-200 max-h-[80vh] relative"
                [tuiDropdown]="tourHint"
                [tuiDropdownManual]="
                  tourService.isActive() &&
                  tourService.step() === TourStep.SEARCH
                "
                tuiDropdownDirection="bottom"
              >
                <div class="p-2">
                  <tui-tabs [(activeItemIndex)]="activeSearchTab">
                    @if (groupedResults().length > 1) {
                      <button tuiTab>
                        {{ 'all' | translate }}
                        <span
                          tuiBadge
                          size="s"
                          appearance="neutral"
                          class="ml-2 inline-flex items-center"
                        >
                          {{ totalResults() }}
                        </span>
                      </button>
                    }
                    @for (group of groupedResults(); track group.key) {
                      <button tuiTab>
                        {{ group.key | translate }}
                        <span
                          tuiBadge
                          size="s"
                          appearance="neutral"
                          class="ml-2 inline-flex items-center"
                        >
                          {{ group.items.length }}
                        </span>
                      </button>
                    }
                  </tui-tabs>
                </div>

                <tui-scrollbar class="flex-1 min-h-0">
                  <tui-data-list
                    size="s"
                    [emptyContent]="
                      (results() !== null && totalResults() === 0
                        ? 'nothingFound'
                        : ''
                      ) | translate
                    "
                  >
                    @if (
                      groupedResults().length > 1 && activeSearchTab() === 0
                    ) {
                      <!-- "All" Tab -->
                      @for (group of groupedResults(); track group.key) {
                        <tui-opt-group [label]="group.key | translate">
                          @for (
                            item of group.items;
                            track item.href + item.type + item.title
                          ) {
                            <a
                              tuiOption
                              [routerLink]="item.href || null"
                              (click)="onResultClick(item, $event)"
                              [class.ring-2]="isTourHighlight(item)"
                              [class.ring-negative]="isTourHighlight(item)"
                              class="relative"
                            >
                              @if (isTourHighlight(item)) {
                                <span
                                  class="absolute bottom-2 left-2 pointer-events-none z-10 size-0"
                                >
                                  <tui-pulse />
                                </span>
                              }
                              <ng-container
                                [ngTemplateOutlet]="itemTemplate"
                                [ngTemplateOutletContext]="{
                                  $implicit: item,
                                }"
                              ></ng-container>
                            </a>
                          }
                        </tui-opt-group>
                      }
                    } @else {
                      <!-- Category specific Tab -->
                      @let tabOffset = groupedResults().length > 1 ? 1 : 0;
                      @let activeGroup =
                        groupedResults()[activeSearchTab() - tabOffset];
                      @if (activeGroup) {
                        @for (
                          item of activeGroup.items;
                          track item.href + item.type + item.title
                        ) {
                          <a
                            tuiOption
                            [routerLink]="item.href || null"
                            (click)="onResultClick(item, $event)"
                            [class.ring-2]="isTourHighlight(item)"
                            [class.ring-negative]="isTourHighlight(item)"
                            class="relative"
                          >
                            @if (isTourHighlight(item)) {
                              <span
                                class="absolute bottom-2 left-2 pointer-events-none z-10 size-0"
                              >
                                <tui-pulse />
                              </span>
                            }
                            <ng-container
                              [ngTemplateOutlet]="itemTemplate"
                              [ngTemplateOutletContext]="{
                                $implicit: item,
                              }"
                            ></ng-container>
                          </a>
                        }
                      }
                    }
                  </tui-data-list>
                </tui-scrollbar>
              </div>
            }

            <ng-template #itemTemplate let-item>
              <div class="flex items-center w-full gap-3">
                @if (item.grade !== undefined) {
                  <app-grade
                    [grade]="item.grade"
                    [kind]="item.climbing_kind"
                    class="shrink-0"
                  />
                }
                @if (
                  item.type === 'user' ||
                  item.type === 'indoor' ||
                  item.type === 'equipper'
                ) {
                  <span tuiAvatar size="xs" class="shrink-0">
                    @if (item.icon && !item.icon.startsWith('@tui.')) {
                      <img [src]="item.icon" [alt]="item.title" />
                    } @else {
                      <tui-icon
                        [icon]="
                          item.icon ||
                          (item.type === 'user'
                            ? '@tui.user'
                            : item.type === 'equipper'
                              ? '@tui.hammer'
                              : '@tui.map-pin')
                        "
                      />
                    }
                  </span>
                } @else if (item.icon && item.grade === undefined) {
                  <tui-icon [icon]="item.icon" class="shrink-0" />
                }
                <span tuiTitle class="min-w-0 flex-1 truncate">
                  {{ item.title }}
                  @if (item.subtitle) {
                    <span tuiSubtitle>{{ item.subtitle }}</span>
                  }
                </span>
              </div>
            </ng-template>
          </ng-template>
        </tui-textfield>
      </div>

      <ng-template #tourHint>
        <app-tour-hint
          [description]="'tour.search.description' | translate"
          (next)="onTourNext()"
          (skip)="onTourSkip()"
        />
      </ng-template>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchDropdownComponent {
  readonly loading = input<boolean>(false);

  protected readonly tourService = inject(TourService);
  protected readonly TourStep = TourStep;
  protected readonly outdoorData = inject(OutdoorDataService);
  private readonly searchService = inject(SearchService);
  private readonly areasService = inject(AreasService);
  private readonly cragsService = inject(CragsService);
  private readonly routesService = inject(RoutesService);

  readonly searchValue = signal('');
  readonly searchOpen = signal(false);
  protected activeSearchTab = signal(0);

  constructor() {
    const cdr = inject(ChangeDetectorRef);
    let wasTourSearch = false;
    effect(() => {
      const isTourSearch =
        this.tourService.isActive() &&
        this.tourService.step() === TourStep.SEARCH;

      if (isTourSearch) {
        wasTourSearch = true;
        setTimeout(() => {
          this.searchOpen.set(true);
          this.searchValue.set('Millena');
          cdr.markForCheck();
        }, 500);
      } else if (wasTourSearch) {
        wasTourSearch = false;
        this.searchOpen.set(false);
        this.searchValue.set('');
      }
    });

    effect(() => {
      if (this.searchOpen()) {
        this.activeSearchTab.set(0);
      }
    });

    effect(() => {
      if (this.groupedResults().length <= 1) {
        this.activeSearchTab.set(0);
      }
    });
  }

  protected readonly results = toSignal(
    toObservable(this.searchValue).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((query: string) => this.searchService.search(query)),
    ),
    { initialValue: null as SearchData | null },
  );

  protected toValue(event: Event): string {
    return (event.target as HTMLInputElement)?.value ?? '';
  }

  protected readonly groupedResults = computed(() => {
    const data = this.results();
    if (!data) return [];
    return Object.entries(data)
      .filter(([, items]) => items.length > 0)
      .map(([key, items]) => ({
        key,
        items: items as readonly SearchItem[],
      }));
  });

  protected readonly totalResults = computed(() =>
    this.groupedResults().reduce(
      (acc, current) => acc + current.items.length,
      0,
    ),
  );

  protected onTourNext(): void {
    this.searchOpen.set(false);
    this.searchValue.set('');
    void this.tourService.next();
  }

  protected onTourSkip(): void {
    this.searchOpen.set(false);
    this.searchValue.set('');
    void this.tourService.finish();
  }

  protected onResultClick(item: SearchItem, event?: Event): void {
    if (item.type?.startsWith('create-') || item.type?.startsWith('import-')) {
      event?.preventDefault();
      event?.stopPropagation();

      const query = (this.searchValue() || '').trim();

      switch (item.type) {
        case 'create-area':
          this.areasService.openAreaForm({ areaData: { name: query } });
          break;
        case 'create-crag':
          this.cragsService.openCragForm({
            areaId: this.outdoorData.selectedArea()?.id,
            cragData: { name: query },
          });
          break;
        case 'create-route':
          this.routesService.openRouteForm({
            cragId: this.outdoorData.selectedCrag()?.id,
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
            areaId: this.outdoorData.selectedArea()?.id,
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
            cragId: this.outdoorData.selectedCrag()?.id,
            routeData: {
              name: anuRoute.zlaggableName,
              slug: anuRoute.zlaggableSlug,
              grade: gradeToNumber(anuRoute.difficulty),
              eight_anu_route_slugs: [anuRoute.zlaggableSlug],
            },
          });
          break;
        }
      }
    }

    const isTourSearch =
      this.tourService.isActive() &&
      this.tourService.step() === TourStep.SEARCH;

    this.searchOpen.set(false);
    this.searchValue.set('');

    if (isTourSearch) {
      void this.tourService.next();
    }
  }

  protected isTourHighlight(item: SearchItem): boolean {
    if (
      !this.tourService.isActive() ||
      this.tourService.step() !== TourStep.SEARCH
    ) {
      return false;
    }
    const pathSegments = (item.href || '').split('/').filter(Boolean);
    const isArea =
      item.type === 'area' ||
      (pathSegments.length === 2 && pathSegments[0] === 'area');
    const isMillena = (item.title || '').toLowerCase().includes('millena');
    return isArea && isMillena;
  }
}
