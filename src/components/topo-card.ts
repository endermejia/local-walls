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
import { TopoListItem } from '../models';
import { GlobalData } from '../services/global-data';
import { ChartRoutesByGradeComponent } from './chart-routes-by-grade';
import { TopoImagePipe } from '../pipes/topo-image.pipe';

@Component({
  selector: 'app-topo-card',
  imports: [
    CommonModule,
    TuiAppearance,
    TuiIcon,
    TuiTitle,
    TuiHeader,
    TranslatePipe,
    ChartRoutesByGradeComponent,
    TopoImagePipe,
  ],
  template: `
    <button
      class="p-6 rounded-3xl text-start w-full"
      tuiAppearance="outline"
      type="button"
      (click.zoneless)="selected.emit()"
    >
      <div class="flex flex-col min-w-0 grow gap-2">
        <header tuiHeader>
          <h2 tuiTitle>{{ topo().name }}</h2>
        </header>
        <section class="flex flex-col gap-2">
          @if (topo().photo; as photo) {
            <img
              [src]="
                ({
                  path: photo,
                  version: global.topoPhotoVersion(),
                }
                  | topoImage
                  | async) || global.iconSrc()('topo')
              "
              alt="topo"
              class="w-full h-40 object-cover rounded shadow-sm"
              loading="lazy"
              decoding="async"
            />
          }
          <div class="flex items-center justify-between gap-2 mt-auto">
            <div class="flex items-center justify-between gap-2">
              @let shade = getShadeInfo(topo());
              <tui-icon [icon]="shade.icon" class="opacity-70 text-xl" />
              <span class="text-sm opacity-80">
                {{ shade.label | translate }}
                @if (topo().shade_change_hour) {
                  · {{ 'filters.shade.changeAt' | translate }}
                  {{ topo().shade_change_hour }}
                }
              </span>
            </div>
            <app-chart-routes-by-grade
              [grades]="topo().grades"
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
  selected = output<void>();

  protected getShadeInfo(t: TopoListItem) {
    if (t.shade_morning && t.shade_afternoon) {
      return { icon: '@tui.cloud-sun', label: 'filters.shade.allDay' };
    }
    if (t.shade_morning) {
      return { icon: '@tui.sun', label: 'filters.shade.morning' };
    }
    if (t.shade_afternoon) {
      return { icon: '@tui.moon', label: 'filters.shade.afternoon' };
    }
    return { icon: '@tui.sun', label: 'filters.shade.noShade' };
  }
}
