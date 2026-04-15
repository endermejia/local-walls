import { LowerCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiButton, TuiIcon, TuiLink, TuiTitle } from '@taiga-ui/core';
import { TuiCardLarge, TuiHeader } from '@taiga-ui/layout';

import { ChartRoutesByGradeComponent } from '../charts/chart-routes-by-grade';

@Component({
  selector: 'app-crag-card',
  standalone: true,
  imports: [
    TuiCardLarge,
    TuiHeader,
    TuiTitle,
    TuiLink,
    TuiIcon,
    TuiButton,
    RouterLink,
    TranslatePipe,
    LowerCasePipe,
    ChartRoutesByGradeComponent,
  ],
  template: `
    <div
      tuiCardLarge
      [appearance]="appearance()"
      class="w-full h-full flex flex-col"
    >
      <div class="flex flex-col min-w-0 grow">
        <header tuiHeader>
          <div class="flex items-center gap-2">
            <a
              [tuiTitle]="titleSize()"
              tuiLink
              [routerLink]="['/area', crag().area_slug, crag().slug]"
              class="font-bold no-underline!"
              [class.text-3xl!]="titleSize() === 'l'"
            >
              {{ crag().name }}
            </a>
            @if (crag().liked) {
              <tui-icon
                icon="@tui.heart"
                class="text-2xl"
                [style.color]="'var(--tui-background-accent-2)'"
              />
            }
          </div>
        </header>

        <section class="grid grid-cols-[1fr_auto] gap-2 items-stretch mt-auto">
          <div class="flex flex-col justify-between">
            @if (showAreaName()) {
              <a
                tuiSubtitle
                tuiLink
                [routerLink]="['/area', crag().area_slug]"
                appearance="action-grayscale"
                class="text-sm! w-fit opacity-70"
              >
                {{ crag().area_name }}
              </a>
            } @else {
              <div class="h-1"></div>
            }

            <div class="h-full mt-2 flex items-center gap-4">
              <div class="flex flex-wrap gap-2">
                @if (crag().topos && crag().topos!.length > 0) {
                  @for (topo of crag().topos; track topo.id) {
                    <button
                      tuiButton
                      size="s"
                      appearance="primary-grayscale"
                      class="rounded-full!"
                      [routerLink]="[
                        '/area',
                        crag().area_slug,
                        crag().slug,
                        'topo',
                        topo.id
                      ]"
                      (click)="$event.stopPropagation()"
                    >
                      {{ topo.name }}
                    </button>
                  }
                } @else {
                  <div class="text-lg opacity-70">
                    {{ crag().topos_count || 0 }}
                    {{
                      (crag().topos_count === 1 ? 'topo' : 'topos')
                        | translate
                        | lowercase
                    }}
                  </div>
                }
              </div>

              @if (crag().approach) {
                <div class="flex w-fit items-center gap-1 opacity-70">
                  <tui-icon icon="@tui.footprints" />
                  <span class="whitespace-nowrap">
                    {{ crag().approach }} min.
                  </span>
                </div>
              }
            </div>
          </div>
          <div class="flex items-center">
            <app-chart-routes-by-grade [grades]="crag().grades" />
          </div>
        </section>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CragCardComponent {
  crag = input.required<any>();
  appearance = input<string>('outline');
  titleSize = input<'m' | 'l'>('m');
  showAreaName = input<boolean>(true);
}
