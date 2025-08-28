import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GlobalData } from '../services';
import { RouterLink } from '@angular/router';
import { TuiSurface, TuiTitle } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { TuiHeader, TuiCardLarge } from '@taiga-ui/layout';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    TuiHeader,
    TuiCardLarge,
    TuiTitle,
    TuiBadge,
    TranslatePipe,
    TuiSurface,
  ],
  template: ` <section class="w-full h-full overflow-auto">
    <div class="max-w-5xl mx-auto px-4 pt-6">
      <div
        id="cragsMap"
        class="w-full h-[320px] rounded-xl border border-[color:var(--tui-border-normal)]"
      ></div>

      <h3 class="text-xl font-semibold mt-6 mb-2">
        {{ 'labels.zones' | translate }}
      </h3>
      <div class="grid gap-2">
        @for (z of global.zonesSorted(); track z.id) {
          <div
            tuiCardLarge
            tuiSurface="neutral"
            class="tui-space_top-4 cursor-pointer"
            [routerLink]="['/zone', z.id]"
          >
            <header tuiHeader>
              <h2 tuiTitle>{{ z.name }}</h2>
              <aside tuiAccessories>
                <tui-badge
                  [appearance]="
                    global.isZoneLiked(z.id) ? 'negative' : 'neutral'
                  "
                  iconStart="@tui.heart"
                  size="xl"
                  (click.zoneless)="
                    $event.stopPropagation(); global.toggleLikeZone(z.id)
                  "
                  [attr.aria-label]="
                    (global.isZoneLiked(z.id)
                      ? 'actions.favorite.remove'
                      : 'actions.favorite.add'
                    ) | translate
                  "
                  [attr.title]="
                    (global.isZoneLiked(z.id)
                      ? 'actions.favorite.remove'
                      : 'actions.favorite.add'
                    ) | translate
                  "
                ></tui-badge>
              </aside>
            </header>
            <section>
              <div class="opacity-80">{{ z.description || '—' }}</div>
              <div class="text-sm mt-1">
                {{ 'labels.crags' | translate }}: {{ z.cragIds.length }}
              </div>
            </section>
          </div>
        }
      </div>
    </div>
  </section>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex grow overflow-auto',
  },
})
export class HomeComponent {
  protected readonly global = inject(GlobalData);

  constructor() {
    this.global.setSelectedZone(null);
    this.global.setSelectedCrag(null);
    this.global.setSelectedTopo(null);
    this.global.setSelectedRoute(null);
  }
}
