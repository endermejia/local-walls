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
import { GlobalData } from '../services';
import { Location, LowerCasePipe, DecimalPipe } from '@angular/common';
import { ClimbingRoute } from '../models';
import { SectionHeaderComponent } from '../components/section-header';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiLoader } from '@taiga-ui/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-route',
  standalone: true,
  imports: [
    SectionHeaderComponent,
    TranslatePipe,
    TuiLoader,
    RouterLink,
    LowerCasePipe,
    DecimalPipe,
  ],
  template: `
    <section class="w-full max-w-5xl mx-auto p-4">
      @if (route(); as r) {
        <app-section-header
          [title]="r.zlaggableName"
          [liked]="global.liked()"
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
              <strong>{{ 'labels.zone' | translate }}:</strong>
              {{ r.areaName }}
            </div>
          }
          @if (r.cragName && r.countrySlug && r.cragSlug) {
            <div>
              <strong>{{ 'labels.crag' | translate }}:</strong>
              <a
                class="tui-link"
                [routerLink]="['/crag', r.countrySlug, r.cragSlug]"
              >
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
            <div class="text-center">
              <div class="text-lg font-semibold">
                {{ r.averageRating | number: '1.1-2' }}
              </div>
              <div class="text-xs uppercase opacity-80">
                {{ 'labels.rating' | translate | lowercase }}
              </div>
            </div>
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
          <tui-loader size="xxl"></tui-loader>
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
      this.global.loadCrag(countrySlug, cragSlug);
      this.global
        .loadCragSectors(countrySlug, cragSlug)
        .then(() =>
          this.global.sector.set(
            this.global
              .cragSectors()
              .find((s) => s.sectorSlug === sectorSlug) ?? null,
          ),
        );
      this.global.loadCragRoutes(countrySlug, cragSlug, sectorSlug);
      this.global.loadRoute(countrySlug, cragSlug, sectorSlug, zlaggableSlug);
    });
  }

  goBack(): void {
    this.location.back();
  }
}
