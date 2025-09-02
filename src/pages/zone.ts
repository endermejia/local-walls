import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Location } from '@angular/common';
import { TuiSurface, TuiTitle } from '@taiga-ui/core';
import { TuiAvatar } from '@taiga-ui/kit';
import { TuiHeader, TuiCardLarge } from '@taiga-ui/layout';
import { GlobalData } from '../services';
import type { Crag, Zone } from '../models';
import { TranslatePipe } from '@ngx-translate/core';
import { SectionHeaderComponent } from '../components/section-header';

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
    TuiAvatar,
    SectionHeaderComponent,
  ],
  template: `
    <section class="w-full max-w-5xl mx-auto p-4">
      @if (zone(); as z) {
        <app-section-header
          [title]="z.name"
          [liked]="global.isZoneLiked()(z.id)"
          (back)="goBack()"
          (toggleLike)="global.toggleLikeZone(z.id)"
        />

        @if (z.description) {
          <p class="mt-2 opacity-80">{{ z.description }}</p>
        }

        <h2 class="text-xl font-semibold mt-6 mb-2">
          {{ 'labels.crags' | translate }}
        </h2>
        <div class="grid gap-2">
          @for (c of cragsSorted(); track c.id) {
            <div
              tuiCardLarge
              [tuiSurface]="global.isCragLiked()(c.id) ? 'accent' : 'neutral'"
              class="cursor-pointer"
              [routerLink]="['/crag', c.id]"
            >
              <div class="flex items-center gap-3">
                <tui-avatar
                  tuiThumbnail
                  size="l"
                  [src]="global.iconSrc()('crag')"
                  class="self-center"
                  [attr.aria-label]="'labels.crag' | translate"
                />
                <div class="flex flex-col min-w-0 grow">
                  <header tuiHeader>
                    <h2 tuiTitle>{{ c.name }}</h2>
                  </header>
                  <section>
                    <div class="text-sm opacity-80">
                      {{ 'labels.approach' | translate }} :
                      {{ c.approach || '—' }}
                      {{ 'units.min' | translate }}
                    </div>
                    <div class="text-sm mt-1">
                      {{ 'labels.parkings' | translate }}:
                      {{ c.parkings.length }}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          }
        </div>
      } @else {
        <p>{{ 'common.loading' | translate }}</p>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow overflow-auto p-4' },
})
export class ZoneComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly global = inject(GlobalData);
  private readonly location = inject(Location);

  zoneId: WritableSignal<string | null> = signal<string | null>(null);
  zone: Signal<Zone | null> = computed<Zone | null>(() => {
    const id = this.zoneId();
    return id ? this.global.zones().find((z) => z.id === id) || null : null;
  });

  crags: Signal<Crag[]> = this.global.selectedZoneCrags;
  cragsSorted: Signal<Crag[]> = computed<Crag[]>(() => {
    const likedIds = new Set(this.global.appUser()?.likedCrags ?? []);
    return [...this.crags()].sort(
      (a, b) =>
        +!likedIds.has(a.id) - +!likedIds.has(b.id) ||
        a.name.localeCompare(b.name),
    );
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    this.zoneId.set(id);
    this.global.setSelectedZone(id);
    this.global.setSelectedCrag(null);
    this.global.setSelectedTopo(null);
    this.global.setSelectedRoute(null);
  }

  goBack(): void {
    this.location.back();
  }
}
