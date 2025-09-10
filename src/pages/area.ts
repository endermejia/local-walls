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
import { Location, LowerCasePipe, DecimalPipe } from '@angular/common';
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
    DecimalPipe,
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

        <!-- Country / meta -->
        <div class="mt-2 text-sm opacity-80">
          {{ a.countryName }}
        </div>

        @if (a.description) {
          <p class="mt-2 opacity-80">{{ a.description }}</p>
        }

        <!-- Quick stats -->
        <div class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="text-center">
            <div class="text-lg font-semibold">{{ a.totalRoutes ?? a.totalBoulders ?? a.totalZlaggables ?? 0 }}</div>
            <div class="text-xs uppercase opacity-80">{{ 'labels.routes' | translate | lowercase }}</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-semibold">{{ a.totalBoulders ?? 0 }}</div>
            <div class="text-xs uppercase opacity-80">{{ 'labels.boulders' | translate | lowercase }}</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-semibold">{{ a.totalZlaggables ?? a.totalAscents ?? 0 }}</div>
            <div class="text-xs uppercase opacity-80">{{ 'labels.ascents' | translate | lowercase }}</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-semibold">{{ a.totalFollowers ?? 0 }}</div>
            <div class="text-xs uppercase opacity-80">{{ 'labels.followers' | translate | lowercase }}</div>
          </div>
        </div>

        <!-- Disciplines / rating -->
        <div class="mt-3 flex flex-wrap gap-2 text-xs">
          @if (a.hasSportClimbing) {
            <span class="px-2 py-1 rounded-full bg-[--tui-background-neutral-2]">Sport</span>
          }
          @if (a.hasBouldering) {
            <span class="px-2 py-1 rounded-full bg-[--tui-background-neutral-2]">Boulder</span>
          }
          @if (a.averageRating) {
            <span class="px-2 py-1 rounded-full bg-[--tui-background-neutral-2]">
              ★ {{ a.averageRating | number: '1.1-1' }}
            </span>
          }
        </div>

        <app-chart-routes-by-grade class="mt-4" [grades]="a.grades" />

        <h2 class="text-xl font-semibold mt-6 mb-2">
          {{ 'labels.crags' | translate }}
        </h2>
        <div class="grid gap-2 mb-2">
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
                      {{ (c.totalZlaggables ?? 0) }} {{ 'labels.routes' | translate | lowercase }} ·
                      {{ (c.totalAscents ?? 0) }} {{ 'labels.ascents' | translate | lowercase }}
                    </div>
                  </section>
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

  constructor() {
    effect(() => {
      const countrySlug = this.countrySlug();
      const areaSlug = this.areaSlug();
      this.global.loadArea(countrySlug, areaSlug);
      this.global.loadAreaCrags(countrySlug, areaSlug, {
        pageIndex: 0,
        sortField: 'totalascents',
        order: 'desc',
      });
    });
  }

  goBack(): void {
    this.location.back();
  }

  ngOnDestroy() {
    this.global.area.set(null);
  }
}
