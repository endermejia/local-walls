import { LowerCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiButton, TuiIcon, TuiLink } from '@taiga-ui/core';

import { ChartRoutesByGradeComponent } from '../charts/chart-routes-by-grade';
import { AppCardComponent } from '../ui/card';

@Component({
  selector: 'app-crag-card',
  standalone: true,
  imports: [
    AppCardComponent,
    TuiButton,
    TuiIcon,
    TuiLink,
    TranslatePipe,
    RouterLink,
    LowerCasePipe,
    ChartRoutesByGradeComponent,
  ],
  template: `
    <app-card
      [appearance]="appearance()"
      [titleSize]="titleSize()"
      [liked]="crag().liked"
    >
      <ng-container title>
        <a
          tuiLink
          [routerLink]="['/area', crag().area_slug, crag().slug]"
          class="no-underline! truncate block"
          (click)="$event.stopPropagation()"
        >
          {{ crag().name }}
        </a>
      </ng-container>

      <div content class="flex flex-col gap-1">
        @if (showAreaName()) {
          <a
            tuiLink
            [routerLink]="['/area', crag().area_slug]"
            appearance="action-grayscale"
            class="text-sm! w-fit opacity-70 mb-1"
            (click)="$event.stopPropagation()"
          >
            {{ crag().area_name }}
          </a>
        }
        <div class="h-full content-center flex items-center gap-4">
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
                    topo.id,
                  ]"
                  (click)="$event.stopPropagation()"
                >
                  {{ topo.name }}
                </button>
              }
            } @else {
              <div class="text-xl">
                {{ crag().topos_count || 0 }}
                {{ 'topos' | translate | lowercase }}
              </div>
            }
          </div>
          @if (crag().approach) {
            <div class="flex w-fit items-center gap-1 opacity-70">
              <tui-icon icon="@tui.footprints" />
              <span class="whitespace-nowrap">
                {{ crag().approach }}
                min.
              </span>
            </div>
          }
        </div>
      </div>

      <app-chart-routes-by-grade
        extra
        (click)="$event.stopPropagation()"
        [grades]="crag().grades"
      />
    </app-card>
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
