import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

import type { TopoRouteWithRoute } from '../../models';

import {
  GradeLabelPipe,
  TopoPointStateBadgePipe,
  TopoPointStateColorPipe,
  TopoPointStateLabelPipe,
} from '../../pipes';

export interface RenderedRoute extends TopoRouteWithRoute {
  style: { stroke: string; opacity: number; isDashed: boolean };
  width: number;
  pointsString: string;
}

@Component({
  selector: 'app-topo-route-renderer',
  imports: [
    GradeLabelPipe,
    TopoPointStateBadgePipe,
    TopoPointStateColorPipe,
    TopoPointStateLabelPipe,
  ],
  template: `
    @if (hasAccess()) {
      @let ratio = imageRatio();
      @let hScale = 1000 / ratio;
      <svg
        class="absolute inset-0 w-full h-full pointer-events-none"
        [attr.viewBox]="'0 0 1000 ' + hScale"
        preserveAspectRatio="none"
      >
        <!-- Clickable transparent overlay for paths -->
        @for (tr of renderedRoutes(); track tr.route_id) {
          @if (tr.path && tr.path.points.length > 0) {
            @if (tr.path.type === 'circle') {
              @for (pt of tr.path.points; track $index) {
                <circle
                  class="pointer-events-auto cursor-pointer"
                  (click)="onPathClick($event, tr); $event.stopPropagation()"
                  (mouseenter)="hoverRoute.emit(tr.route_id)"
                  (mouseleave)="unhoverRoute.emit()"
                  [attr.cx]="pt.x * 1000"
                  [attr.cy]="pt.y * hScale"
                  [attr.r]="tr.width * 3500 + 10"
                  fill="transparent"
                />
              }
            } @else {
              <polyline
                class="pointer-events-auto cursor-pointer"
                (click)="onPathClick($event, tr); $event.stopPropagation()"
                (mouseenter)="hoverRoute.emit(tr.route_id)"
                (mouseleave)="unhoverRoute.emit()"
                [attr.points]="tr.pointsString"
                fill="none"
                stroke="transparent"
                [attr.stroke-width]="
                  (selectedRouteId() === tr.route_id ? 0.06 : 0.025) * 1000
                "
                stroke-linejoin="round"
                stroke-linecap="round"
              />
            }
          }
        }

        <!-- Visible path drawing -->
        @for (tr of renderedRoutes(); track tr.route_id) {
          @if (tr.path && tr.path.points.length > 0) {
            @let circleR = tr.width * 3500;
            @let isSel =
              selectedRouteId() === tr.route_id ||
              hoveredRouteId() === tr.route_id;
            @let isTraverse = tr.path.isTraverse;
            @if (tr.path.type === 'circle') {
              @for (pt of tr.path.points; track $index) {
                @let ptColor = pt.state | topoPointStateColor: tr.style.stroke;
                @let badge = pt.state | topoPointStateBadge;
                <circle
                  [attr.cx]="pt.x * 1000"
                  [attr.cy]="pt.y * hScale"
                  [attr.r]="circleR"
                  fill="none"
                  stroke="white"
                  [style.opacity]="tr.style.isDashed ? 1 : 0.7"
                  [attr.stroke-width]="
                    tr.width * 1000 + (tr.style.isDashed ? 2.5 : 1.5)
                  "
                  [attr.stroke-dasharray]="tr.style.isDashed ? '6, 6' : 'none'"
                  stroke-linejoin="round"
                  stroke-linecap="round"
                  class="transition-all duration-300"
                />
                <circle
                  [attr.cx]="pt.x * 1000"
                  [attr.cy]="pt.y * hScale"
                  [attr.r]="circleR"
                  fill="rgba(0,0,0,0.05)"
                  [attr.stroke]="tr.style.stroke"
                  [style.color]="tr.style.stroke"
                  [style.opacity]="tr.style.opacity"
                  [attr.stroke-width]="tr.width * 1000"
                  [attr.stroke-dasharray]="tr.style.isDashed ? '6, 6' : 'none'"
                  stroke-linejoin="round"
                  stroke-linecap="round"
                  class="transition-all duration-300"
                  [class.selected-circle-pulse]="isSel"
                />
                @if (isTraverse) {
                  <text
                    [attr.x]="pt.x * 1000"
                    [attr.y]="pt.y * hScale + circleR * 0.35"
                    text-anchor="middle"
                    fill="white"
                    font-weight="bold"
                    [attr.font-size]="circleR * 0.85"
                    style="pointer-events: none; user-select: none; text-shadow: 0 0 3px rgba(0,0,0,0.9)"
                  >
                    {{ $index + 1 }}
                  </text>
                }
                @if (badge) {
                  @let label = pt.state | topoPointStateLabel;
                  @let pillW =
                    tr.width *
                    (pt.state === 'match'
                      ? 3800
                      : pt.state === 'start'
                        ? 3600
                        : pt.state === 'foot'
                          ? 3400
                          : 2800);
                  @let pillH = tr.width * 1400;
                  @let pillY = pt.y * hScale + circleR + pillH * 0.45;
                  <g class="pointer-events-none" style="user-select: none">
                    <rect
                      [attr.x]="pt.x * 1000 - pillW / 2"
                      [attr.y]="pillY - pillH / 2"
                      [attr.width]="pillW"
                      [attr.height]="pillH"
                      [attr.rx]="pillH / 2"
                      [attr.fill]="ptColor"
                      stroke="white"
                      stroke-width="0.75"
                    />
                    <text
                      [attr.x]="pt.x * 1000"
                      [attr.y]="pillY + pillH * 0.32"
                      text-anchor="middle"
                      fill="white"
                      font-weight="bold"
                      [attr.font-size]="tr.width * 950"
                      font-family="sans-serif"
                      style="text-shadow: 0 0 2px rgba(0,0,0,0.8)"
                    >
                      {{ label }}
                    </text>
                  </g>
                }
              }
            } @else {
              <polyline
                [attr.points]="tr.pointsString"
                fill="none"
                stroke="white"
                [style.opacity]="tr.style.isDashed ? 1 : 0.7"
                [attr.stroke-width]="
                  tr.width * 1000 + (tr.style.isDashed ? 2.5 : 1.5)
                "
                [attr.stroke-dasharray]="tr.style.isDashed ? '10, 10' : 'none'"
                stroke-linejoin="round"
                stroke-linecap="round"
                class="transition-all duration-300"
              />
              <polyline
                [attr.points]="tr.pointsString"
                fill="none"
                [attr.stroke]="tr.style.stroke"
                [style.color]="tr.style.stroke"
                [style.opacity]="tr.style.opacity"
                [attr.stroke-width]="tr.width * 1000"
                [attr.stroke-dasharray]="tr.style.isDashed ? '10, 10' : 'none'"
                stroke-linejoin="round"
                stroke-linecap="round"
                class="transition-all duration-300"
                [class.selected-line-glow]="isGlowActive() && isSel"
              />
              @if (isTraverse) {
                @for (pt of tr.path.points; track $index) {
                  @let ptColor =
                    pt.state | topoPointStateColor: tr.style.stroke;
                  @let badge = pt.state | topoPointStateBadge;
                  @let ptR = tr.width * 1800;
                  <circle
                    [attr.cx]="pt.x * 1000"
                    [attr.cy]="pt.y * hScale"
                    [attr.r]="ptR"
                    [attr.fill]="tr.style.stroke"
                    stroke="white"
                    stroke-width="1"
                  />
                  <text
                    [attr.x]="pt.x * 1000"
                    [attr.y]="pt.y * hScale + ptR * 0.35"
                    text-anchor="middle"
                    fill="white"
                    font-weight="bold"
                    [attr.font-size]="ptR * 0.85"
                    style="pointer-events: none; user-select: none; text-shadow: 0 0 3px rgba(0,0,0,0.9)"
                  >
                    {{ $index + 1 }}
                  </text>
                  @if (badge) {
                    @let label = pt.state | topoPointStateLabel;
                    @let pillW =
                      tr.width *
                      (pt.state === 'match'
                        ? 3800
                        : pt.state === 'start'
                          ? 3600
                          : pt.state === 'foot'
                            ? 3400
                            : 2800);
                    @let pillH = tr.width * 1400;
                    @let pillY = pt.y * hScale + ptR + pillH * 0.45;
                    <g class="pointer-events-none" style="user-select: none">
                      <rect
                        [attr.x]="pt.x * 1000 - pillW / 2"
                        [attr.y]="pillY - pillH / 2"
                        [attr.width]="pillW"
                        [attr.height]="pillH"
                        [attr.rx]="pillH / 2"
                        [attr.fill]="ptColor"
                        stroke="white"
                        stroke-width="0.75"
                      />
                      <text
                        [attr.x]="pt.x * 1000"
                        [attr.y]="pillY + pillH * 0.32"
                        text-anchor="middle"
                        fill="white"
                        font-weight="bold"
                        [attr.font-size]="tr.width * 950"
                        font-family="sans-serif"
                        style="text-shadow: 0 0 2px rgba(0,0,0,0.8)"
                      >
                        {{ label }}
                      </text>
                    </g>
                  }
                }
              } @else {
                <!-- Intermediate state points for polylines -->
                @for (pt of tr.path.points; track $index) {
                  @if (
                    $index > 0 &&
                    $index < tr.path.points.length - 1 &&
                    pt.state &&
                    pt.state !== 'neutral'
                  ) {
                    @let ptColor =
                      pt.state | topoPointStateColor: tr.style.stroke;
                    @let label = pt.state | topoPointStateLabel;
                    @let ptR = tr.width * 1400;
                    @let pillW =
                      tr.width *
                      (pt.state === 'match'
                        ? 3800
                        : pt.state === 'start'
                          ? 3600
                          : pt.state === 'foot'
                            ? 3400
                            : 2800);
                    @let pillH = tr.width * 1400;
                    @let pillY = pt.y * hScale + ptR + pillH * 0.45;
                    <circle
                      [attr.cx]="pt.x * 1000"
                      [attr.cy]="pt.y * hScale"
                      [attr.r]="ptR"
                      fill="white"
                      [attr.stroke]="tr.style.stroke"
                      stroke-width="1.5"
                    />
                    <g class="pointer-events-none" style="user-select: none">
                      <rect
                        [attr.x]="pt.x * 1000 - pillW / 2"
                        [attr.y]="pillY - pillH / 2"
                        [attr.width]="pillW"
                        [attr.height]="pillH"
                        [attr.rx]="pillH / 2"
                        [attr.fill]="ptColor"
                        stroke="white"
                        stroke-width="0.75"
                      />
                      <text
                        [attr.x]="pt.x * 1000"
                        [attr.y]="pillY + pillH * 0.32"
                        text-anchor="middle"
                        fill="white"
                        font-weight="bold"
                        [attr.font-size]="tr.width * 950"
                        font-family="sans-serif"
                        style="text-shadow: 0 0 2px rgba(0,0,0,0.8)"
                      >
                        {{ label }}
                      </text>
                    </g>
                  }
                }
                <!-- Last point / end dot -->
                @if (tr.path.points[tr.path.points.length - 1]; as last) {
                  @let isTop = last.state === 'top';
                  @let endR = tr.width * 1200;
                  <circle
                    [attr.cx]="last.x * 1000"
                    [attr.cy]="last.y * hScale"
                    [attr.r]="endR"
                    fill="white"
                    [style.opacity]="tr.style.opacity"
                    stroke="black"
                    stroke-width="0.5"
                    class="transition-all duration-300"
                    [class.selected-circle-pulse]="!isGlowActive() && isSel"
                  />
                  @if (isTop) {
                    @let pillW = tr.width * 2800;
                    @let pillH = tr.width * 1400;
                    @let pillY = last.y * hScale - endR - pillH * 0.45;
                    <g class="pointer-events-none" style="user-select: none">
                      <rect
                        [attr.x]="last.x * 1000 - pillW / 2"
                        [attr.y]="pillY - pillH / 2"
                        [attr.width]="pillW"
                        [attr.height]="pillH"
                        [attr.rx]="pillH / 2"
                        fill="#EF4444"
                        stroke="white"
                        stroke-width="0.75"
                      />
                      <text
                        [attr.x]="last.x * 1000"
                        [attr.y]="pillY + pillH * 0.32"
                        text-anchor="middle"
                        fill="white"
                        font-weight="bold"
                        [attr.font-size]="tr.width * 950"
                        font-family="sans-serif"
                        style="text-shadow: 0 0 2px rgba(0,0,0,0.8)"
                      >
                        TOP
                      </text>
                    </g>
                  }
                }
              }
            }
          }
        }

        <!-- Grade labels / start markers -->
        @for (tr of renderedRoutes(); track tr.route_id) {
          @if (tr.path && tr.path.points.length > 0) {
            @if (tr.path.isTraverse) {
              <!-- Traverse route grade pill at start point -->
              @if (tr.path.points[0]; as first) {
                <g
                  class="pointer-events-auto cursor-pointer"
                  (click)="onPathClick($event, tr); $event.stopPropagation()"
                  (mouseenter)="hoverRoute.emit(tr.route_id)"
                  (mouseleave)="unhoverRoute.emit()"
                >
                  <rect
                    [attr.x]="first.x * 1000 - tr.width * 2200"
                    [attr.y]="first.y * hScale - tr.width * 3800"
                    [attr.width]="tr.width * 4400"
                    [attr.height]="tr.width * 1800"
                    [attr.rx]="tr.width * 900"
                    [attr.fill]="tr.style.stroke"
                    stroke="white"
                    stroke-width="1"
                  />
                  <text
                    [attr.x]="first.x * 1000"
                    [attr.y]="first.y * hScale - tr.width * 2500"
                    text-anchor="middle"
                    fill="white"
                    style="text-shadow: 0 0 2px rgba(0,0,0,0.8)"
                    [attr.font-size]="tr.width * 1300"
                    font-weight="bold"
                    font-family="sans-serif"
                  >
                    {{ tr.route.grade | gradeLabel }}
                  </text>
                </g>
              }
            } @else {
              <!-- Standard route grade circle at start point -->
              <g
                class="pointer-events-auto cursor-pointer"
                (click)="onPathClick($event, tr); $event.stopPropagation()"
                (mouseenter)="hoverRoute.emit(tr.route_id)"
                (mouseleave)="unhoverRoute.emit()"
              >
                @if (tr.path.points[0]; as first) {
                  @let startColor =
                    first.state | topoPointStateColor: tr.style.stroke;
                  <circle
                    [attr.cx]="first.x * 1000"
                    [attr.cy]="first.y * hScale"
                    [attr.r]="tr.width * 2000"
                    [attr.fill]="startColor"
                    stroke="white"
                    stroke-width="1"
                  />
                  <text
                    [attr.x]="first.x * 1000"
                    [attr.y]="first.y * hScale + tr.width * 600"
                    text-anchor="middle"
                    fill="white"
                    style="text-shadow: 0 0 2px rgba(0,0,0,0.8)"
                    [attr.font-size]="tr.width * 1600"
                    font-weight="bold"
                    font-family="sans-serif"
                  >
                    {{ tr.route.grade | gradeLabel }}
                  </text>
                }
              </g>
            }
          }
        }
      </svg>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopoRouteRendererComponent {
  readonly renderedRoutes = input.required<readonly RenderedRoute[]>();
  readonly imageRatio = input.required<number>();
  readonly selectedRouteId = input<string | number | null>(null);
  readonly hoveredRouteId = input<string | number | null>(null);
  readonly hasAccess = input<boolean>(false);
  readonly isGlowActive = input<boolean>(false);

  readonly pathClick = output<{ event: Event; route: TopoRouteWithRoute }>();
  readonly hoverRoute = output<string | number>();
  readonly unhoverRoute = output<void>();

  protected onPathClick(event: Event, route: TopoRouteWithRoute): void {
    this.pathClick.emit({ event, route });
  }
}
