import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Signal,
  input,
  effect,
  InputSignal,
} from '@angular/core';
import { Location, LowerCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiLoader } from '@taiga-ui/core';
import { TuiRating } from '@taiga-ui/kit';
import { SectionHeaderComponent } from '../components';
import { GlobalData } from '../services';
import { ClimbingRoute } from '../models';

@Component({
  selector: 'app-route',
  standalone: true,
  imports: [
    SectionHeaderComponent,
    TranslatePipe,
    TuiLoader,
    RouterLink,
    LowerCasePipe,
    TuiRating,
    FormsModule,
  ],
  template: `
    <section class="w-full max-w-5xl mx-auto p-4">
      @if (route(); as r) {
        <app-section-header
          [title]="r.zlaggableName"
          [liked]="false"
          (back)="goBack()"
          (toggleLike)="global.toggleLikeRoute(r.zlaggableId)"
        />

        <!-- Meta: Country / Zone / Crag / Sector -->
        <div
          class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm opacity-80"
        >
          @if (r.countryName) {
            <div>
              <strong>{{ 'labels.country' | translate }}:</strong>
              {{ r.countryName }}
            </div>
          }
          @if (r.areaName) {
            <div>
              <strong>{{ 'labels.area' | translate }}:</strong>
              {{ r.areaName }}
            </div>
          }
          @if (r.cragName && r.cragSlug) {
            <div>
              <strong>{{ 'labels.crag' | translate }}:</strong>
              <a class="tui-link" [routerLink]="['/crag', r.cragSlug]">
                {{ r.cragName }}
              </a>
            </div>
          }
          @if (r.sectorName && r.countrySlug && r.cragSlug && r.sectorSlug) {
            <div>
              <strong>{{ 'labels.sector' | translate }}:</strong>
              <a
                class="tui-link"
                [routerLink]="[
                  '/sector',
                  r.countrySlug,
                  r.cragSlug,
                  r.sectorSlug,
                ]"
              >
                {{ r.sectorName }}
              </a>
            </div>
          }
        </div>

        <!-- Quick stats -->
        <div class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="text-center">
            <div class="text-lg font-semibold">{{ r.difficulty || '—' }}</div>
            <div class="text-xs uppercase opacity-80">
              {{ 'labels.grade' | translate | lowercase }}
            </div>
          </div>
          @if (r.totalAscents) {
            <div class="text-center">
              <div class="text-lg font-semibold">{{ r.totalAscents }}</div>
              <div class="text-xs uppercase opacity-80">
                {{ 'labels.ascents' | translate | lowercase }}
              </div>
            </div>
          }
          @if (r.averageRating) {
            <tui-rating
              [max]="5"
              [ngModel]="r.averageRating"
              [readOnly]="true"
              [style.font-size.rem]="0.5"
            />
          }
          @if (r.totalFollowers ?? r.totalRecommended) {
            <div class="text-center">
              <div class="text-lg font-semibold">
                {{ r.totalFollowers ?? r.totalRecommended ?? 0 }}
              </div>
              <div class="text-xs uppercase opacity-80">
                {{
                  (r.totalFollowers ? 'labels.followers' : 'labels.recommended')
                    | translate
                    | lowercase
                }}
              </div>
            </div>
          }
        </div>

        <!-- Ascents breakdown -->
        @if (
          (r.totalFlash ?? 0) +
            (r.totalOnsight ?? 0) +
            (r.totalRedpoint ?? 0) +
            (r.totalTopRope ?? 0) >
          0
        ) {
          <h2 class="text-lg font-semibold mt-6 mb-2">
            {{ 'labels.ascents' | translate }}
          </h2>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            @if (r.totalFlash) {
              <div>
                <strong>{{ 'labels.flash' | translate }}:</strong>
                {{ r.totalFlash }}
              </div>
            }
            @if (r.totalOnsight) {
              <div>
                <strong>{{ 'labels.onsight' | translate }}:</strong>
                {{ r.totalOnsight }}
              </div>
            }
            @if (r.totalRedpoint) {
              <div>
                <strong>{{ 'labels.redpoint' | translate }}:</strong>
                {{ r.totalRedpoint }}
              </div>
            }
            @if (r.totalTopRope) {
              <div>
                <strong>{{ 'labels.toprope' | translate }}:</strong>
                {{ r.totalTopRope }}
              </div>
            }
          </div>
        }
      } @else {
        <div class="flex items-center justify-center w-full min-h-[50vh]">
          <tui-loader size="xxl" />
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow overflow-auto sm:p-4' },
})
export class RouteComponent {
  protected readonly global = inject(GlobalData);
  private readonly location = inject(Location);

  countrySlug: InputSignal<string> = input.required<string>();
  cragSlug: InputSignal<string> = input.required<string>();
  sectorSlug: InputSignal<string> = input.required<string>();
  zlaggableSlug: InputSignal<string> = input.required<string>();
  route: Signal<ClimbingRoute | null> = computed(() => this.global.route());

  constructor() {
    effect(() => {
      const countrySlug = this.countrySlug();
      const cragSlug = this.cragSlug();
      const sectorSlug = this.sectorSlug();
      const zlaggableSlug = this.zlaggableSlug();
      void this.global.loadCrag(countrySlug, cragSlug);
      this.global
        .loadCragSectors(countrySlug, cragSlug)
        .then(() =>
          this.global.sector.set(
            this.global
              .cragSectors()
              .find((s) => s.sectorSlug === sectorSlug) ?? null,
          ),
        );
      void this.global.loadCragRoutes(countrySlug, cragSlug, sectorSlug);
      void this.global.loadRoute(
        countrySlug,
        cragSlug,
        sectorSlug,
        zlaggableSlug,
      );
    });
  }

  goBack(): void {
    this.location.back();
  }
}
