import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Signal,
  signal,
  WritableSignal,
  input,
  effect,
  InputSignal,
} from '@angular/core';
import { GlobalData } from '../services';
import { Location } from '@angular/common';
import { RoutesTableComponent } from '../components';
import { SectionHeaderComponent } from '../components/section-header';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiBottomSheet } from '@taiga-ui/addon-mobile';
import { TuiButton, TuiLoader } from '@taiga-ui/core';
import { TuiSortDirection } from '@taiga-ui/addon-table';
import type { ClimbingRoute } from '../models';

@Component({
  selector: 'app-topo',
  standalone: true,
  imports: [
    TranslatePipe,
    SectionHeaderComponent,
    TuiBottomSheet,
    TuiButton,
    TuiLoader,
    RoutesTableComponent,
  ],
  template: `
    <div class="h-full w-full">
      @let s = global.sector();
      @if (s) {
        <section class="w-full h-full max-w-5xl mx-auto p-4">
          <div class="flex gap-2">
            <app-section-header
              class="w-full  "
              [title]="s.sectorName"
              [liked]="global.liked()"
              (back)="goBack()"
              (toggleLike)="onToggleLike()"
            />
            <!-- Toggle image fit button -->
            @let imgFit = imageFit();
            @if (global.topo()?.photo) {
              <button
                tuiIconButton
                size="s"
                appearance="primary-grayscale"
                (click.zoneless)="toggleImageFit()"
                [iconStart]="
                  imgFit === 'cover'
                    ? '@tui.unfold-horizontal'
                    : '@tui.unfold-vertical'
                "
                class="pointer-events-auto"
                [attr.aria-label]="
                  (imgFit === 'cover'
                    ? 'actions.fit.contain'
                    : 'actions.fit.cover'
                  ) | translate
                "
                [attr.title]="
                  (imgFit === 'cover'
                    ? 'actions.fit.contain'
                    : 'actions.fit.cover'
                  ) | translate
                "
              >
                Toggle image fit
              </button>
            }
          </div>

          <img
            [src]="global.topo()?.photo || global.iconSrc()('topo')"
            [alt]="s.sectorName"
            [class]="'w-full h-full overflow-visible ' + topoPhotoClass()"
            decoding="async"
          />
        </section>

        <tui-bottom-sheet
          [stops]="stops"
          class="z-50"
          role="dialog"
          aria-label="Routes"
        >
          <section class="w-full max-w-5xl mx-auto sm:p-4 overflow-auto">
            <app-routes-table [data]="routes()" [direction]="direction()" />
          </section>
        </tui-bottom-sheet>
      } @else {
        <div class="absolute inset-0 flex items-center justify-center">
          <tui-loader size="xxl"></tui-loader>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow h-full sm:p-4' },
})
export class TopoComponent {
  protected readonly imageFit: WritableSignal<'cover' | 'contain'> =
    signal('cover');
  protected readonly topoPhotoClass: Signal<'object-cover' | 'object-contain'> =
    computed(() =>
      this.imageFit() === 'cover' ? 'object-cover' : 'object-contain',
    );

  protected readonly stops = ['6rem'] as const;
  protected readonly global = inject(GlobalData);
  private readonly location = inject(Location);

  // Route params (both /topo and /sector routes map here)
  countrySlug: InputSignal<string> = input.required();
  cragSlug: InputSignal<string> = input.required();
  id: InputSignal<string | undefined> = input();
  sectorSlug: InputSignal<string | undefined> = input();

  // Routes currently loaded for the crag (used to populate the table)
  routes: Signal<ClimbingRoute[]> = computed<ClimbingRoute[]>(
    () => this.global.routesPageable()?.items ?? [],
  );

  protected readonly direction: WritableSignal<TuiSortDirection> =
    signal<TuiSortDirection>(TuiSortDirection.Asc);

  constructor() {
    // Load sector-specific data when sectorSlug present
    effect(() => {
      this.global.resetDataByPage('sector');
      const countrySlug = this.countrySlug();
      const cragSlug = this.cragSlug();
      const sectorSlug = this.sectorSlug();
      // Ensure crag info is available for breadcrumbs on sector routes
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
    });
  }

  onToggleLike(): void {
    this.global.toggleLikeCrag(this.cragSlug());
  }

  goBack(): void {
    this.location.back();
  }

  protected toggleImageFit(): void {
    this.imageFit.update((v) => (v === 'cover' ? 'contain' : 'cover'));
  }
}
