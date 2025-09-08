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
import { Location } from '@angular/common';
import { TuiSortDirection } from '@taiga-ui/addon-table';
import { GlobalData } from '../services';
import type { Topo, TopoRoute, Route } from '../models';
import { TranslatePipe } from '@ngx-translate/core';
import { SectionHeaderComponent } from '../components/section-header';
import { TuiBottomSheet } from '@taiga-ui/addon-mobile';
import { TuiButton, TuiLoader } from '@taiga-ui/core';
import { RoutesTableComponent } from '../components/routes-table';

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
              [liked]="global.isTopoLiked()(t.id)"
              (back)="goBack()"
              (toggleLike)="global.toggleLikeTopo(t.id)"
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
            <app-routes-table
              [data]="topoRoutesDetailed()"
              [direction]="direction()"
            />
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
  topo: Signal<Topo | null> = computed<Topo | null>(() => {
    const id = this.id();
    return this.global.topos().find((t) => t.id === id) || null;
  });

  topoRoutesDetailed: Signal<(TopoRoute & { route?: Route })[]> = computed(
    () => {
      const id = this.id();
      const tr = this.global.topoRoutes().filter((r) => r.topoId === id);
      const routesIndex = new Map(
        this.global.routesData().map((r) => [r.id, r] as const),
      );
      return tr.map((item) => ({
        ...item,
        route: routesIndex.get(item.routeId),
      }));
    },
  );

  protected readonly direction: WritableSignal<TuiSortDirection> =
    signal<TuiSortDirection>(TuiSortDirection.Asc);

  constructor() {
    effect(() => {
      const id = this.id();
      this.global.setSelectedTopo(id);
      const topo = this.global.topos().find((t) => t.id === id);
      if (topo) {
        this.global.setSelectedCrag(topo.cragId);
        const crag = this.global.crags().find((c) => c.id === topo.cragId);
        if (crag) this.global.setSelectedZone(crag.zoneId);
        this.global.setSelectedRoute(null);
      }
    });
  }

  goBack(): void {
    this.location.back();
  }

  protected toggleImageFit(): void {
    this.imageFit.update((v) => (v === 'cover' ? 'contain' : 'cover'));
  }
}
