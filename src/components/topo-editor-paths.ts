import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  input,
  inject,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopoRouteWithRoute } from '../models';
import { getRouteStyleProperties } from '../utils/topo-styles.utils';
import { getPointsString } from '../utils/svg-path.utils';

@Component({
  selector: 'app-topo-editor-paths',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg
      class="absolute inset-0 w-full h-full cursor-crosshair pointer-events-none"
      [attr.viewBox]="viewBox()"
    >
      @for (tr of routes(); track tr.route_id) {
        @let entry = getPathEntry(tr.route_id);
        @if (entry && entry.points.length > 0) {
          @let isSelected = selectedRouteId() === tr.route_id;
          @let style = getStyle(tr, entry.color);

          <g
            class="pointer-events-auto cursor-pointer"
            (click)="onRouteClick($event, tr)"
            (touchstart)="onRouteClick($event, tr)"
          >
            <!-- Thicker transparent path for much easier hit detection -->
            <polyline
              [attr.points]="getPoints(entry.points)"
              fill="none"
              stroke="transparent"
              [attr.stroke-width]="isSelected ? 0.08 : 0.04"
              stroke-linejoin="round"
              stroke-linecap="round"
            />
            <!-- Border/Shadow Line -->
            <polyline
              [attr.points]="getPoints(entry.points)"
              fill="none"
              stroke="white"
              [style.opacity]="style.isDashed ? 1 : 0.7"
              [attr.stroke-width]="(isSelected ? 4 : 2) + (style.isDashed ? 2 : 1)"
              [attr.stroke-dasharray]="style.isDashed ? '4 4' : 'none'"
              stroke-linejoin="round"
              stroke-linecap="round"
              class="transition-all duration-300"
            />
            <polyline
              [attr.points]="getPoints(entry.points)"
              fill="none"
              [attr.stroke]="style.stroke"
              [style.opacity]="style.opacity"
              [attr.stroke-width]="isSelected ? 4 : 2"
              [attr.stroke-dasharray]="style.isDashed ? '4 4' : 'none'"
              stroke-linejoin="round"
              stroke-linecap="round"
              class="transition-all duration-300"
            />
            <!-- End Circle (Small White) -->
            @if (entry.points[entry.points.length - 1]; as last) {
              <circle
                [attr.cx]="last.x * width()"
                [attr.cy]="last.y * height()"
                [attr.r]="isSelected ? 4 : 2"
                fill="white"
                [style.opacity]="style.opacity"
                stroke="black"
                [attr.stroke-width]="0.5"
              />
            }
          </g>

          @if (isSelected && editable()) {
            @for (pt of entry.points; track $index) {
              <g
                class="cursor-move pointer-events-auto group"
                (mousedown)="onPointMouseDown($event, tr.route_id, $index)"
                (touchstart)="onPointTouchStart($event, tr.route_id, $index)"
                (click)="$event.stopPropagation()"
                (contextmenu)="onPointContextMenu($event, tr.route_id, $index)"
              >
                <circle
                  [attr.cx]="pt.x * width()"
                  [attr.cy]="pt.y * height()"
                  r="12"
                  fill="rgba(0,0,0,0.4)"
                  class="hover:fill-[var(--tui-background-neutral-2)]/60 transition-colors"
                />
                <circle
                  [attr.cx]="pt.x * width()"
                  [attr.cy]="pt.y * height()"
                  r="6"
                  [attr.fill]="style.stroke"
                  class="group-hover:scale-125 transition-transform origin-center"
                  style="transform-box: fill-box"
                />
                <!-- Point Number Bubble (First point) -->
                @if ($index === 0) {
                  <circle
                    [attr.cx]="pt.x * width()"
                    [attr.cy]="pt.y * height() - 20"
                    r="10"
                    fill="var(--tui-background-base)"
                  />
                  <text
                    [attr.x]="pt.x * width()"
                    [attr.y]="pt.y * height() - 16"
                    text-anchor="middle"
                    fill="var(--tui-text-01)"
                    font-size="10"
                    font-weight="bold"
                  >
                    {{ (tr.number || 0) + 1 }}
                  </text>
                }
              </g>
            }
          }
        }
      }
    </svg>
  `,
  styles: [`
    :host {
      display: block;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopoEditorPathsComponent {
  routes = input.required<TopoRouteWithRoute[]>();
  @Input({ required: true }) pathsMap!: Map<number, { points: { x: number; y: number }[]; color?: string }>;

  selectedRouteId = input<number | null>(null);
  width = input(1000);
  height = input(1000);
  editable = input(true);

  @Output() routeClick = new EventEmitter<TopoRouteWithRoute>();
  @Output() pointDragStart = new EventEmitter<{ event: MouseEvent; routeId: number; index: number }>();
  @Output() pointTouchStart = new EventEmitter<{ event: TouchEvent; routeId: number; index: number }>();
  @Output() pointRemove = new EventEmitter<{ event: Event; routeId: number; index: number }>();

  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly viewBox = computed(() => `0 0 ${this.width()} ${this.height()}`);

  getPathEntry(routeId: number) {
      return this.pathsMap.get(routeId);
  }

  getPoints(points: { x: number; y: number }[]): string {
    return getPointsString(points, this.width(), this.height());
  }

  getStyle(tr: TopoRouteWithRoute, color?: string) {
    const isSelected = this.selectedRouteId() === tr.route_id;
    return getRouteStyleProperties(isSelected, false, color, tr.route.grade);
  }

  onRouteClick(event: Event, route: TopoRouteWithRoute): void {
      this.routeClick.emit(route);
  }

  onPointMouseDown(event: MouseEvent, routeId: number, index: number): void {
      this.pointDragStart.emit({ event, routeId, index });
  }

  onPointTouchStart(event: TouchEvent, routeId: number, index: number): void {
      this.pointTouchStart.emit({ event, routeId, index });
  }

  onPointContextMenu(event: Event, routeId: number, index: number): void {
      this.pointRemove.emit({ event, routeId, index });
  }

  // Method to allow parent to trigger check
  markForCheck() {
      this.cdr.markForCheck();
  }
}
