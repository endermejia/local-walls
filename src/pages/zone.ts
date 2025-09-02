import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Location } from '@angular/common';
import { TuiSurface, TuiTitle } from '@taiga-ui/core';
import { TuiBadge, TuiAvatar } from '@taiga-ui/kit';
import { TuiHeader, TuiCardLarge } from '@taiga-ui/layout';
import { GlobalData } from '../services';
import type { Crag, Zone } from '../models';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-zone',
  standalone: true,
  imports: [
    RouterLink,
    TuiHeader,
    TuiCardLarge,
    TuiTitle,
    TuiBadge,
    TranslatePipe,
    TuiSurface,
    TuiAvatar,
  ],
  template: `
    <section class="w-full max-w-5xl mx-auto p-4">
      @if (zone(); as z) {
        <header class="mb-4 flex items-start justify-between gap-2">
          <div class="flex items-center gap-2">
            <tui-badge
              [appearance]="'neutral'"
              iconStart="@tui.chevron-left"
              size="l"
              (click.zoneless)="goBack()"
              [attr.aria-label]="'actions.back' | translate"
              [attr.title]="'actions.back' | translate"
            ></tui-badge>
            <h1 class="text-2xl font-bold">{{ z.name }}</h1>
          </div>
          <tui-badge
            [appearance]="global.isZoneLiked()(z.id) ? 'negative' : 'neutral'"
            iconStart="@tui.heart"
            size="xl"
            (click.zoneless)="global.toggleLikeZone(z.id)"
            [attr.aria-label]="
              (global.isZoneLiked()(z.id)
                ? 'actions.favorite.remove'
                : 'actions.favorite.add'
              ) | translate
            "
            [attr.title]="
              (global.isZoneLiked()(z.id)
                ? 'actions.favorite.remove'
                : 'actions.favorite.add'
              ) | translate
            "
          ></tui-badge>
        </header>

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
              class="tui-space_top-4 cursor-pointer"
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

  zoneId = signal<string | null>(null);
  zone = computed<Zone | null>(() => {
    const id = this.zoneId();
    return id ? this.global.zones().find((z) => z.id === id) || null : null;
  });

  cragsAll = this.global.selectedZoneCrags;

  // Single sorted list: favorites first, then alphabetical
  cragsSorted = computed<Crag[]>(() => {
    const likedIds = new Set(this.global.appUser()?.likedCrags ?? []);
    return [...this.cragsAll()].sort(
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
