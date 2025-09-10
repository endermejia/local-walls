import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  effect,
  Signal,
  InputSignal,
} from '@angular/core';
import type { ClimbingCrag, ClimbingTopo, Parking } from '../models';
import { ChartRoutesByGradeComponent } from '../components';
import { GlobalData } from '../services';
import { Location, LowerCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SectionHeaderComponent } from '../components/section-header';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiAvatar } from '@taiga-ui/kit';
import { TuiHeader, TuiCardLarge } from '@taiga-ui/layout';
import { TuiTitle, TuiSurface, TuiLoader } from '@taiga-ui/core';
import { mapLocationUrl } from '../utils';

@Component({
  selector: 'app-crag',
  standalone: true,
  imports: [
    RouterLink,
    TuiHeader,
    TuiCardLarge,
    TuiTitle,
    TuiSurface,
    TranslatePipe,
    TuiAvatar,
    SectionHeaderComponent,
    ChartRoutesByGradeComponent,
    TuiLoader,
    LowerCasePipe,
  ],
  template: `
    <section class="w-full max-w-5xl mx-auto p-4">
      @if (crag(); as c) {
        <app-section-header
          [title]="c.cragName"
          [liked]="global.liked()"
          (back)="goBack()"
          (toggleLike)="global.toggleLikeCrag(c.cragSlug)"
        />

        @if (c.description) {
          <p class="mt-2 opacity-80">{{ c.description }}</p>
        }

        <app-chart-routes-by-grade class="mt-4" [grades]="routesByGrade()" />

        <h2 class="text-xl font-semibold mt-6">
          {{ 'labels.parkings' | translate }}
        </h2>
        <div class="mt-2 grid gap-2">
          @for (p of cragParkings(); track p.id) {
            @if (p.location; as pLocation) {
              <a
                class="block"
                [href]="mapLocationUrl(pLocation)"
                target="_blank"
                rel="noopener noreferrer"
                [attr.aria-label]="'actions.openMap' | translate"
                [attr.title]="'actions.openMap' | translate"
              >
                <div tuiCardLarge tuiSurface="neutral" class="cursor-pointer">
                  <div class="flex items-center gap-3">
                    <tui-avatar
                      tuiThumbnail
                      size="l"
                      src="@tui.square-parking"
                      class="self-center"
                      [attr.aria-label]="'labels.parking' | translate"
                    />
                    <div class="flex flex-col min-w-0 grow">
                      <header tuiHeader>
                        <h2 tuiTitle>{{ p.name }}</h2>
                      </header>
                      <section>
                        <div class="text-sm opacity-80">
                          {{ 'labels.lat' | translate }}:
                          {{ pLocation.latitude }} ·
                          {{ 'labels.lng' | translate }}:
                          {{ pLocation.longitude }}
                        </div>
                        @if (p.capacity) {
                          <div class="text-sm opacity-80">
                            {{ 'labels.capacity' | translate }}:
                            {{ p.capacity }}
                          </div>
                        }
                      </section>
                    </div>
                  </div>
                </div>
              </a>
            }
          }
        </div>

        <h2 class="text-xl font-semibold mt-6 mb-2">
          {{ 'labels.topos' | translate }}
        </h2>
        <div class="grid gap-2">
          @for (t of toposSorted(); track t.id) {
            <div
              tuiCardLarge
              [tuiSurface]="global.liked() ? 'accent' : 'neutral'"
              class="cursor-pointer"
              [routerLink]="['/topo', t.id]"
            >
              <div class="flex items-center gap-3">
                <div class="flex flex-col min-w-0 grow">
                  <header tuiHeader>
                    <h2 tuiTitle>{{ t.name }}</h2>
                  </header>
                  <section>
                    <div class="text-sm opacity-80">
                      {{ toposSorted() }}
                      {{ 'labels.routes' | translate | lowercase }}
                    </div>
                  </section>
                </div>
                <div (click.zoneless)="$event.stopPropagation()">
                  <app-chart-routes-by-grade class="mt-2" [grades]="t.grades" />
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
export class CragComponent {
  protected readonly global = inject(GlobalData);
  private readonly location = inject(Location);
  protected readonly mapLocationUrl = mapLocationUrl;

  countrySlug: InputSignal<string> = input.required<string>();
  cragSlug: InputSignal<string> = input.required<string>();
  crag: Signal<ClimbingCrag | null> = computed(() => this.global.crag());

  // TODO: implement topos
  toposSorted: Signal<ClimbingTopo[]> = computed<ClimbingTopo[]>(() => []);

  // TODO: implement crag parkings
  cragParkings: Signal<Parking[]> = computed<Parking[]>(() => []);

  topoRoutesByGrade = computed(
    () => () => ({}) as import('../models').AmountByEveryVerticalLifeGrade,
  );
  routesByGrade = computed<import('../models').AmountByEveryVerticalLifeGrade>(
    () => ({}) as import('../models').AmountByEveryVerticalLifeGrade,
  );

  constructor() {
    effect(() => {
      const countrySlug = this.countrySlug();
      const cragSlug = this.cragSlug();
      this.global.loadCrag(countrySlug, cragSlug);
    });
  }

  goBack(): void {
    this.location.back();
  }
}
