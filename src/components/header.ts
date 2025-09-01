import { AsyncPipe, KeyValuePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { TUI_DEFAULT_MATCHER } from '@taiga-ui/cdk';
import { RouterLink } from '@angular/router';
import {
  TuiButton,
  TuiDataListComponent,
  TuiLink,
  TuiOptGroup,
  TuiTextfield,
  TuiTitle,
} from '@taiga-ui/core';
import { TuiOptionNew } from '@taiga-ui/core/components/data-list';
import {
  TuiSearchHistory,
  TuiSearchHotkey,
  TuiSearchResultsComponent,
} from '@taiga-ui/experimental';
import { TuiAvatar, TuiBreadcrumbs } from '@taiga-ui/kit';
import { TuiCell, TuiInputSearch, TuiNavigation } from '@taiga-ui/layout';
import { filter, map, startWith, switchMap, timer } from 'rxjs';
import { GlobalData } from '../services';
import { OptionsItem, SearchData } from '../models';

type RouterCommand = readonly (string | number)[] | string;

interface BreadcrumbItem {
  caption: string;
  routerLink: RouterCommand;
}

@Component({
  selector: 'app-header',
  imports: [
    AsyncPipe,
    KeyValuePipe,
    ReactiveFormsModule,
    RouterLink,
    TuiAvatar,
    TuiButton,
    TuiCell,
    TuiDataListComponent,
    TuiInputSearch,
    TuiNavigation,
    TuiOptGroup,
    TuiOptionNew,
    TuiSearchHistory,
    TuiSearchHotkey,
    TuiSearchResultsComponent,
    TuiTextfield,
    TuiTitle,
    TuiBreadcrumbs,
    TuiLink,
    TranslatePipe,
  ],
  template: `
    <header
      tuiNavigationHeader
      class="flex items-center justify-between sm:gap-4"
      ngSkipHydration
    >
      <div class="flex items-center gap-2 overflow-hidden" ngSkipHydration>
        <button
          [title]="'common.menu' | translate"
          tuiIconButton
          tuiNavigationDrawer
          type="button"
          [(open)]="open"
          ngSkipHydration
        >
          <tui-data-list ngSkipHydration>
            @for (group of globalService.drawer() | keyvalue; track group.key) {
              <tui-opt-group [label]="group.key | translate" ngSkipHydration>
                @for (item of group.value; track item.name) {
                  <button
                    tuiOption
                    new
                    type="button"
                    (click.zoneless)="onClick(item); open = false"
                    class="gap-2"
                    ngSkipHydration
                  >
                    <tui-avatar
                      [src]="item.icon || '@tui.file'"
                      ngSkipHydration
                    />
                    {{ item.name | translate }}
                  </button>
                }
              </tui-opt-group>
            }
            @for (
              group of globalService.settings() | keyvalue;
              track group.key
            ) {
              <tui-opt-group [label]="group.key | translate" ngSkipHydration>
                @for (item of group.value; track item.name) {
                  <button
                    tuiOption
                    new
                    type="button"
                    (click.zoneless)="onClick(item)"
                    class="gap-2"
                    ngSkipHydration
                  >
                    <tui-avatar
                      [src]="item.icon || '@tui.file'"
                      ngSkipHydration
                    />
                    {{ item.name | translate }}
                  </button>
                }
              </tui-opt-group>
            }
          </tui-data-list>
        </button>
        @let breadcrumbItems = items();
        @if (breadcrumbItems.length > 1) {
          <!-- Mobile -->
          <div class="sm:hidden overflow-hidden">
            <tui-breadcrumbs ngSkipHydration [itemsLimit]="2">
              @for (item of breadcrumbItems; track item.caption) {
                <a
                  class="overflow-hidden"
                  *tuiItem
                  tuiLink
                  [routerLink]="item.routerLink"
                >
                  {{ item.caption | translate }}
                </a>
              }
            </tui-breadcrumbs>
          </div>
          <!-- Desktop -->
          <div class="hidden sm:flex overflow-hidden">
            <tui-breadcrumbs ngSkipHydration>
              @for (item of breadcrumbItems; track item.caption) {
                <a
                  class="overflow-hidden"
                  *tuiItem
                  tuiLink
                  [routerLink]="item.routerLink"
                >
                  {{ item.caption | translate }}
                </a>
              }
            </tui-breadcrumbs>
          </div>
        }
      </div>
      <div class="flex items-center gap-2 sm:gap-4" ngSkipHydration>
        <!-- Desktop: show full search input -->
        <div class="hidden sm:block" ngSkipHydration>
          <tui-textfield ngSkipHydration class="!m-0">
            <input
              #input
              tuiSearchHotkey
              [formControl]="control"
              [tuiInputSearch]="search"
              ngSkipHydration
            />
            <ng-template #search>
              <tui-search-results [results]="results$ | async" ngSkipHydration>
                <tui-search-history
                  [popular]="globalService.searchPopular()"
                  ngSkipHydration
                />
                <ng-template let-item>
                  <a tuiCell [href]="item.href" ngSkipHydration>
                    <tui-avatar
                      [src]="item.icon || '@tui.file'"
                      ngSkipHydration
                    />
                    <span tuiTitle ngSkipHydration>
                      {{ item.title }}
                      <span tuiSubtitle ngSkipHydration>{{
                        item.subtitle
                      }}</span>
                    </span>
                  </a>
                </ng-template>
              </tui-search-results>
            </ng-template>
          </tui-textfield>
        </div>
        <!-- Mobile: show icon button to open search -->
        <button
          tuiIconButton
          type="button"
          class="sm:hidden"
          [iconStart]="'@tui.search'"
          [title]="'common.search' | translate"
          (click.zoneless)="input.open()"
          ngSkipHydration
        >
          Search
        </button>
      </div>
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  protected globalService = inject(GlobalData);

  open = false;
  protected readonly control = new FormControl('');

  items = computed<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = [
      { caption: 'nav.home', routerLink: ['/home'] },
    ];
    const zoneId = this.globalService.selectedZoneId();
    if (zoneId) {
      const zone = this.globalService.zones().find((z) => z.id === zoneId);
      if (zone)
        items.push({ caption: zone.name, routerLink: ['/zone', zone.id] });
    }
    const cragId = this.globalService.selectedCragId();
    if (cragId) {
      const crag = this.globalService.crags().find((c) => c.id === cragId);
      if (crag)
        items.push({ caption: crag.name, routerLink: ['/crag', crag.id] });
    }
    const topoId = this.globalService.selectedTopoId();
    if (topoId) {
      const topo = this.globalService.topos().find((t) => t.id === topoId);
      if (topo)
        items.push({ caption: topo.name, routerLink: ['/topo', topo.id] });
    }
    const routeId = this.globalService.selectedRouteId();
    if (routeId) {
      const route = this.globalService
        .routesData()
        .find((r) => r.id === routeId);
      if (route)
        items.push({ caption: route.name, routerLink: ['/route', route.id] });
    }
    return items;
  });

  protected readonly results$ = this.control.valueChanges.pipe(
    filter(Boolean),
    switchMap((value: string) =>
      timer(2000).pipe(
        map(() => this.filter(value)),
        startWith(null),
      ),
    ),
  );

  protected onClick(item: OptionsItem) {
    item?.fn?.(item);
  }

  private filter(query: string): SearchData {
    return Object.entries(this.globalService.searchData()).reduce(
      (result, [key, value]) => ({
        ...result,
        [key]: value.filter(({ title, href, subtitle = '' }) =>
          TUI_DEFAULT_MATCHER(title + href + subtitle, query),
        ),
      }),
      {},
    );
  }
}
