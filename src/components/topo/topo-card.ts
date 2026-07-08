import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';

import { TuiAppearance, TuiIcon, TuiTitle } from '@taiga-ui/core';
import { TuiHeader } from '@taiga-ui/layout';

import { TranslatePipe } from '@ngx-translate/core';

import { GlobalData } from '../../services/global-data';

import { ChartRoutesByGradeComponent } from '../charts/chart-routes-by-grade';

import { IconSrcPipe } from '../../pipes/icon-src.pipe';
import { ShadeInfoPipe } from '../../pipes/shade-info.pipe';
import { TopoImagePipe } from '../../pipes/topo-image.pipe';
import { TopoListItem } from '../../models';

@Component({
  selector: 'app-topo-card',
  imports: [
    ChartRoutesByGradeComponent,
    CommonModule,
    IconSrcPipe,
    ShadeInfoPipe,
    TopoImagePipe,
    TranslatePipe,
    TuiAppearance,
    TuiHeader,
    TuiIcon,
    TuiTitle,
  ],
  template: `
    @let item = topo();
    <button
      class="p-6 rounded-3xl text-start w-full"
      tuiAppearance="outline"
      type="button"
      (click.zoneless)="selected.emit()"
    >
      <div class="flex flex-col min-w-0 grow gap-2">
        <header tuiHeader>
          <h2 tuiTitle>{{ item.name }}</h2>
        </header>
        <section class="flex flex-col gap-2">
          @if (item.photo; as photo) {
            <img
              [src]="
                ({
                  path: photo,
                  version: global.topoPhotoVersion(),
                  isIndoor: isIndoor(),
                }
                  | topoImage
                  | async) || ('topo' | iconSrc)
              "
              alt="topo"
              class="w-full h-40 object-cover rounded shadow-sm"
              loading="lazy"
              decoding="async"
            />
          }
          <div class="flex items-center justify-between gap-2 mt-auto">
            @if (!isIndoor()) {
              <div class="flex items-center justify-between gap-2">
                @let shade = item | shadeInfo;
                @if (shade) {
                  <tui-icon [icon]="shade.icon" class="opacity-70 text-xl" />
                  <span class="text-sm opacity-80">
                    {{ shade.label | translate }}
                    @if (item.shade_change_hour) {
                      · {{ 'filters.shade.changeAt' | translate }}
                      {{ item.shade_change_hour }}
                    }
                  </span>
                }
              </div>
            } @else {
              <div></div>
            }
            <app-chart-routes-by-grade
              [grades]="item.grades"
              (click)="$event.stopPropagation()"
            />
          </div>
        </section>
      </div>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopoCardComponent {
  protected readonly global = inject(GlobalData);
  topo = input.required<TopoListItem>();
  isIndoor = input<boolean>(false);
  selected = output<void>();
}
