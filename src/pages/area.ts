import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Signal,
  input,
  effect,
  InputSignal,
  OnDestroy,
} from '@angular/core';
import type { ClimbingArea, ClimbingCrag } from '../models';
import { ChartRoutesByGradeComponent } from '../components';
import { GlobalData } from '../services';
import { Location, LowerCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SectionHeaderComponent } from '../components/section-header';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiHeader, TuiCardLarge } from '@taiga-ui/layout';
import { TuiSurface, TuiTitle, TuiLoader } from '@taiga-ui/core';
import { PageableResponse } from '../models/pagination.model';

@Component({
  selector: 'app-zone',
  standalone: true,
  imports: [
    RouterLink,
    TuiHeader,
    TuiCardLarge,
    TuiTitle,
    TranslatePipe,
    TuiSurface,
    SectionHeaderComponent,
    ChartRoutesByGradeComponent,
    TuiLoader,
    LowerCasePipe,
  ],
  template: `
    <section class="w-full max-w-5xl mx-auto p-4">
      @if (area(); as a) {
        <app-section-header
          [title]="a.areaName"
          [liked]="global.liked()"
          (back)="goBack()"
          (toggleLike)="global.toggleLikeZone(a.areaSlug)"
        />

        @if (a.description) {
          <p class="mt-2 opacity-80">{{ a.description }}</p>
        }

        <app-chart-routes-by-grade class="mt-4" [grades]="routesByGrade()" />

        <h2 class="text-xl font-semibold mt-6 mb-2">
          {{ 'labels.crags' | translate }}
        </h2>
        <div class="grid gap-2">
          @for (c of crags()?.items; track c.cragSlug) {
            <div
              tuiCardLarge
              [tuiSurface]="global.liked() ? 'accent' : 'neutral'"
              class="cursor-pointer"
              [routerLink]="['/crag', c.countrySlug, c.cragSlug]"
            >
              <div class="flex items-center gap-3">
                <div class="flex flex-col min-w-0 grow">
                  <header tuiHeader>
                    <h2 tuiTitle>{{ c.cragName }}</h2>
                  </header>
                  <section>
                    <div class="text-sm opacity-80">
                      {{ 'labels.approach' | translate }} :
                      {{ c.totalAscents || '—' }}
                      {{ 'units.min' | translate }}
                    </div>
                    <div class="text-sm mt-1">
                      {{ '// TODO: ' }}
                      {{ 'labels.parkings' | translate | lowercase }}
                    </div>
                  </section>
                </div>
                <div (click.zoneless)="$event.stopPropagation()">
                  <app-chart-routes-by-grade
                    class="mt-2"
                    [grades]="cragRoutesByGrade()"
                  />
                </div>
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="flex items-center justify-center w-full min-h-[50vh]">
          <tui-loader size="xxl"></tui-loader>
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow overflow-auto sm:p-4' },
})
export class AreaComponent implements OnDestroy {
  protected readonly global = inject(GlobalData);
  private readonly location = inject(Location);

  countrySlug: InputSignal<string> = input.required<string>();
  areaSlug: InputSignal<string> = input.required<string>();
  area: Signal<ClimbingArea | null> = computed(() => this.global.area());
  crags: Signal<PageableResponse<ClimbingCrag> | null> = computed(() =>
    this.global.cragsPageable(),
  );

  cragRoutesByGrade = computed<
    import('../models').AmountByEveryVerticalLifeGrade
  >(() => ({}) as import('../models').AmountByEveryVerticalLifeGrade);
  routesByGrade = computed<import('../models').AmountByEveryVerticalLifeGrade>(
    () => ({}) as import('../models').AmountByEveryVerticalLifeGrade,
  );

  constructor() {
    // Ensure data is present when directly navigating by ID
    effect(() => {
      const countrySlug = this.countrySlug();
      const areaSlug = this.areaSlug();
      this.global.loadArea(countrySlug, areaSlug);

      // TODO: implement pageable list for climbing crags (on Area page)
      // using @defer for lazy loading and infinite scroll
    });
  }

  goBack(): void {
    this.location.back();
  }

  ngOnDestroy() {
    this.global.area.set(null);
  }
}
