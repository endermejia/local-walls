import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  computed,
  input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopoRouteWithRoute, VERTICAL_LIFE_GRADES, GRADE_NUMBER_TO_LABEL } from '../models';
import { getRouteStyleProperties, getRouteStrokeWidth } from '../utils/topo-styles.utils';
import { getPointsString } from '../utils/svg-path.utils';

@Component({
  selector: 'app-topo-viewer-paths',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg
      class="absolute inset-0 w-full h-full pointer-events-none"
      [attr.viewBox]="viewBox()"
      preserveAspectRatio="none"
    >
      <!-- Layer 1: Hit Areas (Bottom) -->
      @for (tr of sortedRoutes(); track tr.route_id) {
        @if (tr.path && tr.path.points.length > 0) {
          <polyline
            class="pointer-events-auto cursor-pointer"
            (click)="onRouteClick($event, tr)"
            (mouseenter)="onRouteHover(tr.route_id)"
            (mouseleave)="onRouteHover(null)"
            [attr.points]="getPoints(tr.path.points)"
            fill="none"
            stroke="transparent"
            [attr.stroke-width]="getHitWidth(tr.route_id)"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
        }
      }

      <!-- Layer 2: Visuals (Lines) -->
      @for (tr of sortedRoutes(); track tr.route_id) {
        @if (tr.path && tr.path.points.length > 0) {
          @let style = getStyle(tr);
          @let strokeWidth = getWidth(tr.route_id);

          <!-- Border/Shadow Line -->
          <polyline
            [attr.points]="getPoints(tr.path.points)"
            fill="none"
            stroke="white"
            [style.opacity]="style.isDashed ? 1 : 0.7"
            [attr.stroke-width]="strokeWidth + (style.isDashed ? 2.5 : 1.5)"
            [attr.stroke-dasharray]="style.isDashed ? '10, 10' : 'none'"
            stroke-linejoin="round"
            stroke-linecap="round"
            class="transition-all duration-300"
          />

          <!-- Main Line -->
          <polyline
            [attr.points]="getPoints(tr.path.points)"
            fill="none"
            [attr.stroke]="style.stroke"
            [style.opacity]="style.opacity"
            [attr.stroke-width]="strokeWidth"
            [attr.stroke-dasharray]="style.isDashed ? '10, 10' : 'none'"
            stroke-linejoin="round"
            stroke-linecap="round"
            class="transition-all duration-300"
          />

          <!-- End Circle (Small White) -->
          @if (tr.path.points[tr.path.points.length - 1]; as last) {
            <circle
              [attr.cx]="last.x * width()"
              [attr.cy]="last.y * height()"
              [attr.r]="strokeWidth"
              fill="white"
              [style.opacity]="style.opacity"
              stroke="black"
              [attr.stroke-width]="0.5"
            />
          }
        }
      }

      <!-- Layer 3: Indicators (Top) -->
      @for (tr of sortedRoutes(); track tr.route_id) {
        @if (tr.path && tr.path.points.length > 0) {
          @let style = getStyle(tr);
          @if (tr.path.points[0]; as first) {
            <circle
              class="pointer-events-auto cursor-pointer"
              (click)="onRouteClick($event, tr)"
              (mouseenter)="onRouteHover(tr.route_id)"
              (mouseleave)="onRouteHover(null)"
              [attr.cx]="first.x * width()"
              [attr.cy]="first.y * height()"
              [attr.r]="10"
              [attr.fill]="style.stroke"
              stroke="white"
              stroke-width="1"
            />
            <text
              class="pointer-events-none"
              [attr.x]="first.x * width()"
              [attr.y]="first.y * height() + 3"
              text-anchor="middle"
              fill="white"
              style="text-shadow: 0 0 2px rgba(0,0,0,0.8)"
              font-size="8"
              font-weight="bold"
              font-family="sans-serif"
            >
              {{ getGradeLabel(tr.route.grade) }}
            </text>
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
export class TopoViewerPathsComponent {
  routes = input.required<TopoRouteWithRoute[]>();
  selectedRouteId = input<number | null>(null);
  hoveredRouteId = input<number | null>(null);
  width = input(1000);
  height = input(1000);

  @Output() routeClick = new EventEmitter<TopoRouteWithRoute>();
  @Output() routeHover = new EventEmitter<number | null>();

  protected readonly viewBox = computed(() => `0 0 ${this.width()} ${this.height()}`);

  protected readonly sortedRoutes = computed(() => {
    const routes = [...this.routes()];
    const selectedId = this.selectedRouteId();
    const hoveredId = this.hoveredRouteId();

    return routes.sort((a, b) => {
      const getPriority = (id: number) => {
        if (id === selectedId) return 2;
        if (id === hoveredId) return 1;
        return 0;
      };
      return getPriority(a.route_id) - getPriority(b.route_id);
    });
  });

  onRouteClick(event: Event, route: TopoRouteWithRoute): void {
    event.stopPropagation();
    this.routeClick.emit(route);
  }

  onRouteHover(id: number | null): void {
    this.routeHover.emit(id);
  }

  getPoints(points: { x: number; y: number }[]): string {
    return getPointsString(points, this.width(), this.height());
  }

  getStyle(tr: TopoRouteWithRoute) {
    const isSelected = this.selectedRouteId() === tr.route_id;
    const isHovered = this.hoveredRouteId() === tr.route_id;
    return getRouteStyleProperties(isSelected, isHovered, tr.path?.color, tr.route.grade);
  }

  getWidth(routeId: number): number {
    const isSelected = this.selectedRouteId() === routeId;
    const isHovered = this.hoveredRouteId() === routeId;
    return getRouteStrokeWidth(isSelected, isHovered, 2, 'viewer') * this.width();
  }

  getHitWidth(routeId: number): number {
      const isSelected = this.selectedRouteId() === routeId;
      return (isSelected ? 0.06 : 0.025) * this.width();
  }

  getGradeLabel(grade: number): string {
    return (
      GRADE_NUMBER_TO_LABEL[grade as VERTICAL_LIFE_GRADES] ||
      grade?.toString() ||
      ''
    );
  }
}
