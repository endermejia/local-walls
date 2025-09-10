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
import type { ClimbingTopo, TopoRoute, ClimbingRoute } from '../models';

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
      @if (topo(); as t) {
        <section class="w-full h-full max-w-5xl mx-auto p-4">
          <div class="flex gap-2">
            <app-section-header
              class="w-full  "
              [title]="t.name"
              [liked]="global.liked()"
              (back)="goBack()"
              (toggleLike)="global.toggleLikeTopo(t.slug)"
            />
            <!-- Toggle image fit button -->
            @let imgFit = imageFit();
            @if (t.photo) {
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
            [src]="t.photo || global.iconSrc()('topo')"
            alt="{{ t.name }}"
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

  id: InputSignal<string> = input.required<string>();
  topo: Signal<ClimbingTopo | null> = computed<ClimbingTopo | null>(() =>
    this.global.topo(),
  );

  // Routes currently loaded for the crag (used to populate the table)
  routes: Signal<ClimbingRoute[]> = computed<ClimbingRoute[]>(
    () => this.global.routesPageable()?.items ?? [],
  );

  protected readonly direction: WritableSignal<TuiSortDirection> =
    signal<TuiSortDirection>(TuiSortDirection.Asc);

  constructor() {
    effect(() => {
      const id = this.id();
    });
  }

  goBack(): void {
    this.location.back();
  }

  protected toggleImageFit(): void {
    this.imageFit.update((v) => (v === 'cover' ? 'contain' : 'cover'));
  }
}
