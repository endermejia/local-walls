import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { TuiAppearance, TuiIcon, TuiTitle } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { TuiHeader } from '@taiga-ui/layout';

import { TranslatePipe } from '@ngx-translate/core';

import { OutdoorDataService } from '../../services/outdoor-data.service';

import { IndoorTopoListItem, TopoListItem } from '../../models';

import { IconSrcPipe, ShadeInfoPipe, TopoImagePipe } from '../../pipes';

import { ChartRoutesByGradeComponent } from '../charts/chart-routes-by-grade';

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
    TuiBadge,
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
          <h2 tuiTitle>
            {{ item.name }}
            @if (legacy()) {
              <span
                tuiBadge
                size="s"
                appearance="neutral"
                class="uppercase text-[10px] shrink-0"
              >
                {{ 'indoor.legacy' | translate }}
              </span>
            }
          </h2>
        </header>
        <section class="flex flex-col gap-2">
          @if (item.photo) {
            <div class="relative">
              <img
                [src]="
                  (imageParams() | topoImage | async) || ('topo' | iconSrc)
                "
                (error)="onImageError()"
                alt="topo"
                class="w-full h-40 object-cover rounded shadow-sm"
                loading="lazy"
                decoding="async"
              />
              @if (legacy()) {
                <span
                  tuiBadge
                  size="s"
                  appearance="neutral"
                  class="absolute top-2 left-2 uppercase text-[10px]"
                >
                  {{ 'indoor.legacy' | translate }}
                </span>
              }
            </div>
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
            } @else if (totalRoutes() !== null && totalRoutes()! > 0) {
              <div class="flex items-center gap-2">
                <tui-icon
                  [icon]="'@tui.circle-check'"
                  class="text-xl"
                  [class.text-(--tui-text-positive)]="allCompleted()"
                  [class.opacity-70]="!allCompleted()"
                />
                <span
                  class="text-sm font-semibold"
                  [class.opacity-80]="!allCompleted()"
                >
                  @if (allCompleted()) {
                    {{ 'indoor.allCompleted' | translate }}
                  } @else {
                    {{
                      'indoor.partialCompleted'
                        | translate
                          : {
                              completed: totalRoutes()! - pendingRoutes()!,
                              total: totalRoutes(),
                            }
                    }}
                  }
                </span>
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
  host: {
    class: 'block [content-visibility:auto] [contain-intrinsic-size:0_260px]',
  },
})
export class TopoCardComponent {
  protected readonly outdoorData = inject(OutdoorDataService);
  topo = input.required<TopoListItem | IndoorTopoListItem>();
  isIndoor = input<boolean>(false);
  pendingRoutes = input<number | null>(null);
  totalRoutes = input<number | null>(null);
  selected = output<void>();

  protected readonly imageFailed = signal(false);

  protected readonly imageParams = computed(() => {
    const photo = this.topo().photo;
    if (!photo) return null;
    return {
      path: photo,
      version: this.outdoorData.topoPhotoVersion(),
      isIndoor: this.isIndoor(),
      isThumbnail: !this.imageFailed(),
    };
  });

  protected onImageError(): void {
    if (!this.imageFailed()) {
      this.imageFailed.set(true);
    }
  }

  protected readonly legacy = computed(() => {
    const item = this.topo();
    return 'legacy' in item && !!item.legacy;
  });

  protected readonly allCompleted = computed(
    () => this.totalRoutes() !== null && this.pendingRoutes() === 0,
  );
}
