import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDragPlaceholder,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  TuiButton,
  TuiDialogContext,
  TuiDialogService,
  TuiIcon,
  TuiLoader,
  TuiScrollbar,
  TuiSlider,
} from '@taiga-ui/core';
import { TUI_CONFIRM } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import { IndoorDataService } from '../../services/indoor-data.service';
import { IndoorService } from '../../services/indoor.service';
import { RoutesService } from '../../services/routes.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { ToposService } from '../../services/topos.service';

import {
  ClimbingKind,
  IndoorRouteDto,
  RouteBasicWithOwnData,
  TopoPath,
  TopoPathEditorResult,
  topoPathToJson,
  TopoPoint,
  TopoRouteWithRoute,
} from '../../models';

import {
  GradeLabelPipe,
  TopoHasPathPipe,
  TopoIsRouteVisiblePipe,
  TopoIsTraversePipe,
  TopoPointStateBadgePipe,
  TopoPointStateColorPipe,
  TopoPointStateLabelPipe,
} from '../../pipes';

import {
  addPointToPath,
  attachWheelListener,
  constrainTranslation,
  cyclePointState,
  getPointsString as getPointsStringUtil,
  getRouteStrokeWidth,
  getRouteStyleProperties,
  handleWheelZoom,
  removePoint,
  setupEditorMousePan,
  setupEditorTouchPanPinch,
  startDragPointMouse,
  startDragPointTouch,
} from '../../utils';

import { GradeComponent } from '../ui/avatar-grade';

export interface TopoPathEditorConfig {
  imageUrl: string;
  topoRoutes: TopoRouteWithRoute[];
  topoName?: string;
  topoId?: number | string; // Needed if standalone = true
  // If true, the dialog saves directly to database via ToposService
  standalone?: boolean;
  isIndoor?: boolean;
  centerId?: string;
}

@Component({
  selector: 'app-topo-path-editor-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,

    GradeComponent,
    GradeLabelPipe,
    CdkDrag,
    CdkDragHandle,
    CdkDragPlaceholder,
    CdkDropList,
    TopoHasPathPipe,
    TopoIsRouteVisiblePipe,
    TopoIsTraversePipe,
    TopoPointStateBadgePipe,
    TopoPointStateColorPipe,
    TopoPointStateLabelPipe,
    TranslateModule,
    TuiButton,
    TuiIcon,
    TuiLoader,
    TuiScrollbar,
    TuiSlider,
  ],

  template: `
    <div class="editor-root">
      <!-- ═════════════════════ BODY (canvas + sidebar) ═════════════════════ -->
      <div class="editor-body">
        <!-- ── ROUTE SIDEBAR ── -->
        <aside class="route-sidebar" [class.sidebar-open]="sidebarOpen()">
          <div class="sidebar-inner">
            <div
              class="flex items-center justify-between px-5 pt-4 pb-2 shrink-0"
            >
              <div class="flex items-center gap-2">
                <button
                  tuiIconButton
                  appearance="flat"
                  size="s"
                  iconStart="@tui.x"
                  class="rounded-full! xl:hidden"
                  type="button"
                  [attr.aria-label]="'close' | translate"
                  (click)="sidebarOpen.set(false)"
                >
                  {{ 'close' | translate }}
                </button>
                <p class="sidebar-label m-0! p-0!">
                  {{ 'routes' | translate }}
                </p>
              </div>
              <div class="flex items-center gap-1">
                @if (topoRoutes.length > 0) {
                  <button
                    tuiIconButton
                    appearance="flat"
                    size="s"
                    class="rounded-full!"
                    [iconStart]="
                      areAllRoutesVisible() ? '@tui.eye' : '@tui.eye-off'
                    "
                    (click)="toggleAllRoutesVisibility()"
                  >
                    {{
                      (areAllRoutesVisible() ? 'hideAll' : 'showAll')
                        | translate
                    }}
                  </button>
                }
                @if (context.data.isIndoor && context.data.centerId) {
                  <button
                    tuiButton
                    appearance="flat"
                    size="s"
                    iconStart="@tui.plus"
                    class="rounded-full!"
                    (click)="createNewIndoorRoute()"
                  >
                    {{ 'new' | translate }}
                  </button>
                }
              </div>
            </div>
            <tui-scrollbar class="sidebar-scroll">
              <div
                class="route-list"
                cdkDropList
                (cdkDropListDropped)="dropRoute($event)"
              >
                @for (tr of topoRoutes; track $index; let idx = $index) {
                  @let hasPath =
                    tr.route_id | topoHasPath: pathsMap : pathsVersion();
                  @let isTraverse =
                    tr.route_id | topoIsTraverse: pathsMap : pathsVersion();
                  @let isVisible =
                    tr.route_id | topoIsRouteVisible: hiddenRouteIds();
                  <div
                    cdkDrag
                    class="route-item"
                    role="button"
                    tabindex="0"
                    [class.route-item--active]="
                      selectedRoute()?.route_id === tr.route_id
                    "
                    (click.zoneless)="selectRoute(tr, true)"
                    (keydown.enter.zoneless)="selectRoute(tr, true)"
                  >
                    <tui-icon
                      icon="@tui.grip-vertical"
                      class="drag-handle opacity-30 shrink-0 cursor-grab active:cursor-grabbing"
                      cdkDragHandle
                      (click)="$event.stopPropagation()"
                    />
                    <div class="route-num">{{ idx + 1 }}</div>
                    <div class="route-info">
                      <div class="route-name">{{ tr.route.name }}</div>
                      @if (isTraverse) {
                        <span
                          class="text-[10px] text-(--tui-text-tertiary) flex items-center gap-0.5"
                        >
                          <tui-icon
                            icon="@tui.arrow-right-left"
                            class="text-[10px] scale-75"
                          />
                          {{ 'topos.editor.traverse' | translate }}
                        </span>
                      }
                    </div>
                    <app-grade
                      [grade]="tr.route.grade"
                      [kind]="tr.route.climbing_kind"
                      size="s"
                    />

                    <div class="flex items-center gap-1">
                      <button
                        tuiIconButton
                        appearance="flat"
                        size="s"
                        class="rounded-full! opacity-60 hover:opacity-100"
                        [iconStart]="isVisible ? '@tui.eye' : '@tui.eye-off'"
                        [class.opacity-30]="!isVisible"
                        (click)="toggleRouteVisibility(tr.route_id, $event)"
                      >
                        {{ (isVisible ? 'hide' : 'show') | translate }}
                      </button>
                      <button
                        tuiIconButton
                        appearance="flat"
                        size="s"
                        iconStart="@tui.pencil"
                        class="rounded-full! opacity-60 hover:opacity-100"
                        [title]="'edit' | translate"
                        (click)="editRoute(tr, $event)"
                      >
                        {{ 'edit' | translate }}
                      </button>
                      @if (hasPath) {
                        @if (selectedRoute()?.route_id === tr.route_id) {
                          <button
                            tuiIconButton
                            appearance="flat"
                            size="s"
                            iconStart="@tui.trash"
                            class="rounded-full!"
                            [class.text-white!]="true"
                            (click)="removePath(tr); $event.stopPropagation()"
                          >
                            {{ 'delete' | translate }}
                          </button>
                        } @else {
                          <tui-icon icon="@tui.check" class="path-check" />
                        }
                      }
                    </div>
                    <div
                      *cdkDragPlaceholder
                      class="route-item route-item--placeholder"
                    ></div>
                  </div>
                }
              </div>

              <!-- Tips inside scrollbar -->
              <div class="tips">
                <p class="tip">
                  <tui-icon icon="@tui.mouse-pointer-2" class="tip-icon" />
                  {{ 'topos.editor.addPoint' | translate }}
                </p>
                <p class="tip">
                  <tui-icon icon="@tui.move" class="tip-icon" />
                  {{ 'topos.editor.movePoint' | translate }}
                </p>
              </div>
            </tui-scrollbar>

            <!-- Compact Fixed Bottom Controls -->
            <div class="sidebar-controls">
              <!-- Line Width Slider -->
              <div class="line-width-control">
                <div class="control-header">
                  <span class="control-label">{{
                    'topos.editor.lineWidth' | translate
                  }}</span>
                  <span class="control-value">{{ lineWidth() }}</span>
                </div>
                <input
                  tuiSlider
                  type="range"
                  [min]="1"
                  [max]="15"
                  [step]="0.5"
                  [ngModel]="lineWidth()"
                  (ngModelChange)="lineWidth.set($event)"
                />
              </div>

              <!-- Path Type Selector & Traverse Toggle -->
              @if (selectedRoute()) {
                <div class="path-type-control">
                  <div class="control-header">
                    <span class="control-label">{{
                      'topos.editor.pathType' | translate
                    }}</span>
                  </div>
                  <div class="flex gap-2">
                    <button
                      tuiButton
                      type="button"
                      size="s"
                      [appearance]="
                        selectedRoutePathType() === 'line'
                          ? 'primary'
                          : 'secondary'
                      "
                      class="flex-1 rounded-xl!"
                      (click)="setSelectedRoutePathType('line')"
                    >
                      <tui-icon icon="@tui.minus" class="mr-1" />
                      <span>{{ 'topos.editor.pathTypeLine' | translate }}</span>
                    </button>
                    <button
                      tuiButton
                      type="button"
                      size="s"
                      [appearance]="
                        selectedRoutePathType() === 'circle'
                          ? 'primary'
                          : 'secondary'
                      "
                      class="flex-1 rounded-xl!"
                      (click)="setSelectedRoutePathType('circle')"
                    >
                      <tui-icon icon="@tui.circle" class="mr-1" />
                      <span>{{
                        'topos.editor.pathTypeCircle' | translate
                      }}</span>
                    </button>
                  </div>

                  <!-- Traverse toggle -->
                  <button
                    tuiButton
                    type="button"
                    size="s"
                    [appearance]="
                      selectedRouteIsTraverse() ? 'primary' : 'secondary'
                    "
                    class="w-full rounded-xl! mt-2"
                    (click)="toggleSelectedRouteTraverse()"
                  >
                    <tui-icon icon="@tui.arrow-right-left" class="mr-1" />
                    <span>{{ 'topos.editor.traverse' | translate }}</span>
                  </button>

                  <!-- Point states help & legend -->
                  <div
                    class="mt-3 pt-3 border-t border-(--tui-border-normal) text-xs flex flex-col gap-1.5 opacity-80"
                  >
                    <span
                      class="font-medium text-[11px] text-(--tui-text-tertiary)"
                    >
                      {{ 'topos.editor.cyclePointState' | translate }}
                    </span>
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-1">
                        <span
                          class="w-2.5 h-2.5 rounded-full bg-[#22C55E] inline-block"
                        ></span>
                        <span>S: {{ 'topos.legend.start' | translate }}</span>
                      </div>
                      <div class="flex items-center gap-1">
                        <span
                          class="w-2.5 h-2.5 rounded-full bg-[#EF4444] inline-block"
                        ></span>
                        <span>T: {{ 'topos.legend.top' | translate }}</span>
                      </div>
                      <div class="flex items-center gap-1">
                        <span
                          class="w-2.5 h-2.5 rounded-full bg-[#3B82F6] inline-block"
                        ></span>
                        <span>M: {{ 'topos.legend.match' | translate }}</span>
                      </div>
                      <div class="flex items-center gap-1">
                        <span
                          class="w-2.5 h-2.5 rounded-full bg-[#EAB308] inline-block"
                        ></span>
                        <span>F: {{ 'topos.legend.foot' | translate }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </aside>

        <!-- Mobile backdrop -->
        @if (sidebarOpen()) {
          <div
            class="mobile-backdrop"
            (click)="sidebarOpen.set(false)"
            role="presentation"
          ></div>
        }

        <!-- ── CANVAS AREA ── -->
        <div class="canvas-area" #editorArea>
          <div
            #container
            class="canvas-container"
            [style.transform]="transform()"
            [style.transform-origin]="'0 0'"
            [style.width.px]="width()"
            [style.height.px]="height()"
            (mousedown.zoneless)="onImageClick($event)"
            (contextmenu.zoneless)="$event.preventDefault()"
            (touchstart.zoneless)="onTouchStart($event)"
          >
            <img
              #image
              [src]="context.data.imageUrl"
              class="topo-image"
              (load)="onImageLoad()"
              alt="Topo background"
            />

            <!-- SVG Paths Overlay -->
            <svg
              class="svg-overlay"
              [attr.viewBox]="viewBox()"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              @for (entry of pathsEntries(); track entry[0]) {
                @let routeId = entry[0];
                @let pathData = entry[1];
                @let isSelected = selectedRoute()?.route_id == routeId;
                @let isVisible = routeId | topoIsRouteVisible: hiddenRouteIds();
                @if (isSelected || isVisible) {
                  @let style =
                    routeStyleMap()[routeId] || {
                      stroke: '#22c55e',
                      opacity: 0.8,
                      isDashed: true,
                    };
                  @let strokeWidthFactor =
                    routeStrokeWidthMap()[routeId] ?? lineWidth() / 1000;
                  <g
                    class="path-group"
                    (click)="
                      selectRoute(pathData._ref || { route_id: routeId });
                      $event.stopPropagation()
                    "
                    (touchstart)="
                      selectRoute(pathData._ref || { route_id: routeId });
                      $event.stopPropagation()
                    "
                  >
                    @if (pathData.type === 'circle') {
                      @let strokeW = strokeWidthFactor * width();
                      @let circleR = strokeW * 3.5;
                      @let isTraverse = pathData.isTraverse;
                      @for (pt of pathData.points; track $index) {
                        @let ptColor =
                          pt.state | topoPointStateColor: style.stroke;
                        @let badge = pt.state | topoPointStateBadge;
                        <!-- Hit area circle -->
                        <circle
                          [attr.cx]="pt.x * width()"
                          [attr.cy]="pt.y * height()"
                          [attr.r]="circleR + strokeW * 2"
                          fill="transparent"
                        />
                        <!-- Shadow circle -->
                        <circle
                          [attr.cx]="pt.x * width()"
                          [attr.cy]="pt.y * height()"
                          [attr.r]="circleR"
                          fill="none"
                          stroke="white"
                          [style.opacity]="style.isDashed ? 1 : 0.7"
                          [attr.stroke-width]="
                            strokeW + (style.isDashed ? 2.5 : 1.5)
                          "
                          [attr.stroke-dasharray]="
                            style.isDashed
                              ? width() * 0.008 + ' ' + width() * 0.008
                              : 'none'
                          "
                        />
                        <!-- Main circle -->
                        <circle
                          [attr.cx]="pt.x * width()"
                          [attr.cy]="pt.y * height()"
                          [attr.r]="circleR"
                          fill="rgba(0,0,0,0.05)"
                          [attr.stroke]="style.stroke"
                          [style.color]="style.stroke"
                          [style.opacity]="style.opacity"
                          [attr.stroke-width]="strokeW"
                          [attr.stroke-dasharray]="
                            style.isDashed
                              ? width() * 0.008 + ' ' + width() * 0.008
                              : 'none'
                          "
                          [class.selected-circle-pulse]="isSelected"
                        />
                        @if (isTraverse) {
                          <text
                            [attr.x]="pt.x * width()"
                            [attr.y]="pt.y * height() + circleR * 0.35"
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
                            strokeW *
                            (pt.state === 'match'
                              ? 3.8
                              : pt.state === 'start'
                                ? 3.6
                                : pt.state === 'foot'
                                  ? 3.4
                                  : 2.8);
                          @let pillH = strokeW * 1.4;
                          @let pillY = pt.y * height() + circleR + pillH * 0.45;
                          <g
                            class="pointer-events-none"
                            style="user-select: none"
                          >
                            <rect
                              [attr.x]="pt.x * width() - pillW / 2"
                              [attr.y]="pillY - pillH / 2"
                              [attr.width]="pillW"
                              [attr.height]="pillH"
                              [attr.rx]="pillH / 2"
                              [attr.fill]="ptColor"
                              stroke="white"
                              stroke-width="0.75"
                            />
                            <text
                              [attr.x]="pt.x * width()"
                              [attr.y]="pillY + pillH * 0.32"
                              text-anchor="middle"
                              fill="white"
                              font-weight="bold"
                              [attr.font-size]="strokeW * 0.95"
                              font-family="sans-serif"
                              style="text-shadow: 0 0 2px rgba(0,0,0,0.8)"
                            >
                              {{ label }}
                            </text>
                          </g>
                        }
                      }
                    } @else {
                      @let isTraverse = pathData.isTraverse;
                      <!-- Hit area -->
                      <polyline
                        [attr.points]="pointsStringMap()[routeId]"
                        fill="none"
                        stroke="transparent"
                        [attr.stroke-width]="strokeWidthFactor * width() * 5"
                        stroke-linejoin="round"
                        stroke-linecap="round"
                      />
                      <!-- Shadow -->
                      <polyline
                        [attr.points]="pointsStringMap()[routeId]"
                        fill="none"
                        stroke="white"
                        [style.opacity]="style.isDashed ? 1 : 0.7"
                        [attr.stroke-width]="
                          strokeWidthFactor * width() +
                          (style.isDashed ? 2.5 : 1.5)
                        "
                        [attr.stroke-dasharray]="
                          style.isDashed
                            ? width() * 0.01 + ' ' + width() * 0.01
                            : 'none'
                        "
                        stroke-linejoin="round"
                        stroke-linecap="round"
                      />
                      <!-- Main line -->
                      <polyline
                        [attr.points]="pointsStringMap()[routeId]"
                        fill="none"
                        [attr.stroke]="style.stroke"
                        [style.color]="style.stroke"
                        [style.opacity]="style.opacity"
                        [attr.stroke-width]="strokeWidthFactor * width()"
                        [attr.stroke-dasharray]="
                          style.isDashed
                            ? width() * 0.01 + ' ' + width() * 0.01
                            : 'none'
                        "
                        stroke-linejoin="round"
                        stroke-linecap="round"
                      />

                      @if (!isSelected) {
                        @if (isTraverse) {
                          @for (pt of pathData.points; track $index) {
                            @let strokeW = strokeWidthFactor * width();
                            @let ptColor =
                              pt.state | topoPointStateColor: style.stroke;
                            @let badge = pt.state | topoPointStateBadge;
                            @let ptR = strokeW * 1.8;
                            <circle
                              [attr.cx]="pt.x * width()"
                              [attr.cy]="pt.y * height()"
                              [attr.r]="ptR"
                              [attr.fill]="style.stroke"
                              stroke="white"
                              stroke-width="1"
                            />
                            <text
                              [attr.x]="pt.x * width()"
                              [attr.y]="pt.y * height() + ptR * 0.35"
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
                                strokeW *
                                (pt.state === 'match'
                                  ? 3.8
                                  : pt.state === 'start'
                                    ? 3.6
                                    : pt.state === 'foot'
                                      ? 3.4
                                      : 2.8);
                              @let pillH = strokeW * 1.4;
                              @let pillY = pt.y * height() + ptR + pillH * 0.45;
                              <g
                                class="pointer-events-none"
                                style="user-select: none"
                              >
                                <rect
                                  [attr.x]="pt.x * width() - pillW / 2"
                                  [attr.y]="pillY - pillH / 2"
                                  [attr.width]="pillW"
                                  [attr.height]="pillH"
                                  [attr.rx]="pillH / 2"
                                  [attr.fill]="ptColor"
                                  stroke="white"
                                  stroke-width="0.75"
                                />
                                <text
                                  [attr.x]="pt.x * width()"
                                  [attr.y]="pillY + pillH * 0.32"
                                  text-anchor="middle"
                                  fill="white"
                                  font-weight="bold"
                                  [attr.font-size]="strokeW * 0.95"
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
                          @for (pt of pathData.points; track $index) {
                            @if (
                              $index > 0 &&
                              $index < pathData.points.length - 1 &&
                              pt.state &&
                              pt.state !== 'neutral'
                            ) {
                              @let strokeW = strokeWidthFactor * width();
                              @let ptColor =
                                pt.state | topoPointStateColor: style.stroke;
                              @let label = pt.state | topoPointStateLabel;
                              @let ptR = strokeW * 1.4;
                              @let pillW =
                                strokeW *
                                (pt.state === 'match'
                                  ? 3.8
                                  : pt.state === 'start'
                                    ? 3.6
                                    : pt.state === 'foot'
                                      ? 3.4
                                      : 2.8);
                              @let pillH = strokeW * 1.4;
                              @let pillY = pt.y * height() + ptR + pillH * 0.45;
                              <circle
                                [attr.cx]="pt.x * width()"
                                [attr.cy]="pt.y * height()"
                                [attr.r]="ptR"
                                fill="white"
                                [attr.stroke]="style.stroke"
                                stroke-width="1.5"
                              />
                              <g
                                class="pointer-events-none"
                                style="user-select: none"
                              >
                                <rect
                                  [attr.x]="pt.x * width() - pillW / 2"
                                  [attr.y]="pillY - pillH / 2"
                                  [attr.width]="pillW"
                                  [attr.height]="pillH"
                                  [attr.rx]="pillH / 2"
                                  [attr.fill]="ptColor"
                                  stroke="white"
                                  stroke-width="0.75"
                                />
                                <text
                                  [attr.x]="pt.x * width()"
                                  [attr.y]="pillY + pillH * 0.32"
                                  text-anchor="middle"
                                  fill="white"
                                  font-weight="bold"
                                  [attr.font-size]="strokeW * 0.95"
                                  font-family="sans-serif"
                                  style="text-shadow: 0 0 2px rgba(0,0,0,0.8)"
                                >
                                  {{ label }}
                                </text>
                              </g>
                            }
                          }

                          <!-- End dot -->
                          @if (
                            pathData.points[pathData.points.length - 1];
                            as last
                          ) {
                            @let strokeW = strokeWidthFactor * width();
                            @let isTop = last.state === 'top';
                            @let endR = strokeW * (isTop ? 1.6 : 1.2);
                            <circle
                              [attr.cx]="last.x * width()"
                              [attr.cy]="last.y * height()"
                              [attr.r]="endR"
                              [attr.fill]="isTop ? '#EF4444' : 'white'"
                              [style.opacity]="style.opacity"
                              [attr.stroke]="isTop ? 'white' : 'black'"
                              [attr.stroke-width]="isTop ? 1 : 0.5"
                            />
                            @if (isTop) {
                              @let pillW = strokeW * 2.8;
                              @let pillH = strokeW * 1.4;
                              @let pillY =
                                last.y * height() - endR - pillH * 0.45;
                              <g
                                class="pointer-events-none"
                                style="user-select: none"
                              >
                                <rect
                                  [attr.x]="last.x * width() - pillW / 2"
                                  [attr.y]="pillY - pillH / 2"
                                  [attr.width]="pillW"
                                  [attr.height]="pillH"
                                  [attr.rx]="pillH / 2"
                                  fill="#EF4444"
                                  stroke="white"
                                  stroke-width="0.75"
                                />
                                <text
                                  [attr.x]="last.x * width()"
                                  [attr.y]="pillY + pillH * 0.32"
                                  text-anchor="middle"
                                  fill="white"
                                  font-weight="bold"
                                  [attr.font-size]="strokeW * 0.95"
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

                    <!-- Traverse route grade pill at start point -->
                    @if (pathData.isTraverse && pathData.points.length > 0) {
                      @if (pathData.points[0]; as first) {
                        @let strokeW = strokeWidthFactor * width();
                        @let gradeStr = pathData._ref.route.grade | gradeLabel;
                        @if (gradeStr) {
                          <g
                            class="pointer-events-none"
                            style="user-select: none"
                          >
                            <rect
                              [attr.x]="first.x * width() - strokeW * 2.2"
                              [attr.y]="first.y * height() - strokeW * 3.8"
                              [attr.width]="strokeW * 4.4"
                              [attr.height]="strokeW * 1.8"
                              [attr.rx]="strokeW * 0.9"
                              [attr.fill]="style.stroke"
                              stroke="white"
                              stroke-width="1"
                            />
                            <text
                              [attr.x]="first.x * width()"
                              [attr.y]="first.y * height() - strokeW * 2.5"
                              text-anchor="middle"
                              fill="white"
                              style="text-shadow: 0 0 2px rgba(0,0,0,0.8)"
                              [attr.font-size]="strokeW * 1.3"
                              font-weight="bold"
                              font-family="sans-serif"
                            >
                              {{ gradeStr }}
                            </text>
                          </g>
                        }
                      }
                    }
                  </g>

                  <!-- Control points (selected only) -->
                  @if (isSelected) {
                    @let strokeW = strokeWidthFactor * width();
                    @let isTraverse = pathData.isTraverse;
                    @for (pt of pathData.points; track $index) {
                      @let ptColor =
                        pt.state | topoPointStateColor: style.stroke;
                      @let badge = pt.state | topoPointStateBadge;
                      <g
                        class="control-point"
                        (mousedown)="startDragging($event, routeId, $index)"
                        (touchstart)="
                          startDraggingTouch($event, routeId, $index)
                        "
                        (contextmenu)="removePoint($event, routeId, $index)"
                        (dblclick)="cyclePointState($event, routeId, $index)"
                      >
                        @if (pathData.type === 'circle') {
                          @let circleR = strokeW * 3.5;
                          <!-- Circle mode control hit area -->
                          <circle
                            [attr.cx]="pt.x * width()"
                            [attr.cy]="pt.y * height()"
                            [attr.r]="circleR"
                            fill="transparent"
                          />
                          @if (!isTraverse) {
                            <circle
                              [attr.cx]="pt.x * width()"
                              [attr.cy]="pt.y * height()"
                              [attr.r]="strokeW * 1.5"
                              fill="rgba(0,0,0,0.4)"
                            />
                            <circle
                              [attr.cx]="pt.x * width()"
                              [attr.cy]="pt.y * height()"
                              [attr.r]="strokeW * 0.9"
                              [attr.fill]="style.stroke"
                              stroke="white"
                              stroke-width="1"
                            />
                          }
                        } @else {
                          <!-- Polyline mode control points -->
                          @let ptR = isTraverse ? strokeW * 1.8 : strokeW * 0.9;
                          @let haloR =
                            isTraverse ? ptR + strokeW * 0.5 : strokeW * 1.5;
                          <circle
                            [attr.cx]="pt.x * width()"
                            [attr.cy]="pt.y * height()"
                            [attr.r]="haloR"
                            fill="rgba(0,0,0,0.4)"
                          />
                          <circle
                            [attr.cx]="pt.x * width()"
                            [attr.cy]="pt.y * height()"
                            [attr.r]="ptR"
                            [attr.fill]="style.stroke"
                            stroke="white"
                            stroke-width="1"
                          />
                          @if (isTraverse) {
                            <text
                              [attr.x]="pt.x * width()"
                              [attr.y]="pt.y * height() + ptR * 0.35"
                              text-anchor="middle"
                              fill="white"
                              font-weight="bold"
                              [attr.font-size]="ptR * 0.85"
                              style="pointer-events: none; user-select: none; text-shadow: 0 0 3px rgba(0,0,0,0.9)"
                            >
                              {{ $index + 1 }}
                            </text>
                          }
                          @if (badge) {
                            @let label = pt.state | topoPointStateLabel;
                            @let pillW =
                              strokeW *
                              (pt.state === 'match'
                                ? 3.8
                                : pt.state === 'start'
                                  ? 3.6
                                  : pt.state === 'foot'
                                    ? 3.4
                                    : 2.8);
                            @let pillH = strokeW * 1.4;
                            @let pillY = pt.y * height() + ptR + pillH * 0.45;
                            <g
                              class="pointer-events-none"
                              style="user-select: none"
                            >
                              <rect
                                [attr.x]="pt.x * width() - pillW / 2"
                                [attr.y]="pillY - pillH / 2"
                                [attr.width]="pillW"
                                [attr.height]="pillH"
                                [attr.rx]="pillH / 2"
                                [attr.fill]="ptColor"
                                stroke="white"
                                stroke-width="0.75"
                              />
                              <text
                                [attr.x]="pt.x * width()"
                                [attr.y]="pillY + pillH * 0.32"
                                text-anchor="middle"
                                fill="white"
                                font-weight="bold"
                                [attr.font-size]="strokeW * 0.95"
                                font-family="sans-serif"
                                style="text-shadow: 0 0 2px rgba(0,0,0,0.8)"
                              >
                                {{ label }}
                              </text>
                            </g>
                          }
                        }
                      </g>
                    }
                  }
                }
              }
            </svg>
          </div>

          <!-- Loading overlay -->
          @if (loading()) {
            <div class="loading-overlay">
              <tui-loader size="xl"></tui-loader>
            </div>
          }
        </div>

        <!-- Mobile FAB to toggle sidebar -->
        @if (!sidebarOpen()) {
          <button
            tuiIconButton
            appearance="floating"
            size="m"
            class="fab-routes bg-(--tui-background-base)!"
            type="button"
            [attr.aria-label]="'routes' | translate"
            (click)="sidebarOpen.set(true)"
          >
            <tui-icon icon="@tui.list" />
          </button>
        }
      </div>

      <!-- ═══════════════════════ FOOTER ═══════════════════════ -->
      <footer class="editor-footer">
        <div class="footer-actions-left">
          <button
            tuiButton
            type="button"
            appearance="flat"
            size="m"
            (click)="close()"
          >
            {{ 'cancel' | translate }}
          </button>
        </div>

        <div class="footer-actions-right">
          <button
            tuiButton
            type="button"
            appearance="flat"
            size="m"
            [disabled]="loading()"
            (click)="sortByPosition()"
          >
            <tui-icon icon="@tui.list-ordered" class="mr-1" />
            <span>{{ 'topos.editor.sort' | translate }}</span>
          </button>

          <button
            tuiButton
            type="button"
            appearance="primary"
            size="m"
            [disabled]="loading()"
            (click)="saveAll()"
          >
            {{ 'save' | translate }}
          </button>
        </div>
      </footer>
    </div>
  `,
  styles: `
    :host {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 10000;
      font-family: 'Inter', system-ui, sans-serif;
    }

    /* ── Root layout ── */
    .editor-root {
      display: flex;
      flex-direction: column;
      width: 100dvw;
      height: 100dvh;
      overflow: hidden;
      background: var(--tui-background-neutral-2);
      color: var(--tui-text-primary);
    }

    /* ── Footer ── */
    .editor-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1.25rem;
      flex-shrink: 0;
      border-top: 1px solid var(--tui-border-normal);
      background: var(--tui-background-base);
      gap: 1rem;
      position: relative;
      z-index: 50;
    }

    .footer-actions-left,
    .footer-actions-right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    /* Hide sort button text on very small screens if necessary */
    @media (max-width: 480px) {
      .footer-actions-right span {
        display: none;
      }
      .footer-actions-right button {
        min-width: 2.5rem;
        padding: 0 0.5rem;
      }
    }

    /* ── Body ── */
    .editor-body {
      display: flex;
      flex: 1;
      overflow: hidden;
      position: relative;
    }

    /* ── Sidebar ── */
    .route-sidebar {
      width: 26rem;
      flex-shrink: 0;
      border-right: 1px solid var(--tui-border-normal);
      background: var(--tui-background-base);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 20;
      transition: transform 0.2s ease;
    }

    .sidebar-inner {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .sidebar-label {
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      opacity: 0.45;
      padding: 1.25rem 1.25rem 0.5rem;
      flex-shrink: 0;
    }

    .sidebar-scroll {
      flex: 1 1 0%;
      min-height: 0;
      height: 0;
    }

    .route-list {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      padding: 0.25rem 0.75rem 0.5rem;
    }

    .route-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 1rem;
      border-radius: 1rem;
      text-align: left;
      width: 100%;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      border: 1px solid transparent;
      background: var(--tui-background-base);
      color: inherit;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .route-item:hover {
      background: var(--tui-background-neutral-1-hover);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      border-color: var(--tui-border-hover);
    }

    .route-item--placeholder {
      background: var(--tui-background-neutral-1) !important;
      border: 1.5px dashed var(--tui-border-normal) !important;
      box-shadow: none !important;
      transform: none !important;
      opacity: 0.5;
    }

    .cdk-drag-preview .route-item,
    .cdk-drag-preview {
      background: var(--tui-background-base);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      border-radius: 1rem;
      opacity: 0.95;
    }

    .route-item--active {
      background: var(--tui-background-accent-2) !important;
      color: var(--tui-text-primary-on-accent-2) !important;
      border-color: transparent !important;
      box-shadow: 0 4px 15px var(--tui-background-accent-2-half) !important;
    }

    .route-num {
      flex-shrink: 0;
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 0.8rem;
      background: var(--tui-background-neutral-2);
      border: 1px solid var(--tui-border-normal);
      transition: all 0.2s ease;
    }

    .route-item--active .route-num {
      background: var(--tui-background-accent-1);
      color: var(--tui-text-primary-on-accent-1);
      border-color: transparent;
    }

    .route-info {
      flex: 1;
      min-width: 0;
    }
    .route-name {
      font-weight: 700;
      font-size: 0.875rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      letter-spacing: -0.01em;
    }
    .route-grade {
      font-size: 0.75rem;
      opacity: 0.55;
      font-weight: 600;
    }

    .route-item--active .route-grade {
      opacity: 0.85;
    }

    .path-check {
      color: var(--tui-text-positive);
      font-size: 0.875rem;
      flex-shrink: 0;
      filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.1));
    }

    .route-item--active .path-check {
      color: white;
    }

    .tips {
      padding: 0.5rem 1.25rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      border-top: 1px solid var(--tui-border-normal);
      margin-top: 0.5rem;
    }

    .tip,
    .tip--danger {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      opacity: 0.65;
    }

    .tip--danger {
      opacity: 0.8;
    }
    .tip-icon {
      color: var(--tui-text-accent-1);
      font-size: 0.875rem;
    }
    .tip-icon--danger {
      color: var(--tui-text-negative);
      font-size: 0.875rem;
    }

    /* ── Controls Panel ── */
    .sidebar-controls {
      flex-shrink: 0;
      border-top: 1px solid var(--tui-border-normal);
      background: var(--tui-background-neutral-1);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 0.875rem 1.25rem;
    }

    .line-width-control,
    .path-type-control {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .control-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .control-label {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      opacity: 0.6;
    }

    .control-value {
      font-size: 0.875rem;
      font-weight: 800;
      color: var(--tui-text-accent-1);
    }

    /* ── Mobile/tablet sidebar overlay (below xl) ── */
    @media (max-width: 1279px) {
      .route-sidebar {
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        width: 85vw;
        max-width: 26rem;
        transform: translateX(-100%);
        box-shadow: 4px 0 24px rgba(0, 0, 0, 0.3);
      }

      .route-sidebar.sidebar-open {
        transform: translateX(0);
      }

      .tips {
        display: none;
      }

      .fab-routes {
        display: flex !important;
      }
    }

    @media (min-width: 1280px) {
      .route-sidebar {
        transform: none !important;
      }

      .fab-routes {
        display: none !important;
      }

      .mobile-backdrop {
        display: none !important;
      }
    }

    /* ── Mobile backdrop ── */
    .mobile-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      z-index: 15;
    }

    .fab-routes {
      position: absolute;
      top: 1rem;
      left: 1rem;
      z-index: 30;
      border-radius: 50% !important;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      display: none;
    }

    /* ── Canvas area ── */
    .canvas-area {
      flex: 1;
      position: relative;
      overflow: hidden;
      background: var(--tui-background-neutral-2);
      cursor: grab;
    }

    .canvas-area:active {
      cursor: grabbing;
    }

    .canvas-container {
      position: absolute;
      top: 0;
      left: 0;
      box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
      border-radius: 0.5rem;
      overflow: hidden;
      transform-origin: 0 0;
      transition: transform 75ms ease-out;
      line-height: 0;
    }

    .topo-image {
      display: block;
      width: 100%;
      height: 100%;
      pointer-events: none;
      user-select: none;
      object-fit: cover;
    }

    .svg-overlay {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    .path-group {
      pointer-events: auto;
      cursor: pointer;
    }
    .control-point {
      cursor: move;
      pointer-events: auto;
    }

    /* ── Loading overlay ── */
    .loading-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 50;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopoPathEditorDialogComponent implements AfterViewInit {
  protected readonly context =
    injectContext<
      TuiDialogContext<TopoPathEditorResult | boolean, TopoPathEditorConfig>
    >();
  private readonly topos = inject(ToposService);
  private readonly indoor = inject(IndoorService);
  private readonly indoorData = inject(IndoorDataService);
  private readonly routesService = inject(RoutesService);
  private readonly supabase = inject(SupabaseService);
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly imageElement =
    viewChild.required<ElementRef<HTMLImageElement>>('image');
  protected readonly containerElement =
    viewChild.required<ElementRef<HTMLDivElement>>('container');
  protected readonly editorAreaElement =
    viewChild.required<ElementRef<HTMLDivElement>>('editorArea');

  loading = signal(false);
  selectedRoute = signal<TopoRouteWithRoute | null>(null);
  sidebarOpen = signal(false);
  topoRoutes: TopoRouteWithRoute[] = [];
  hiddenRouteIds = signal<Set<string | number>>(new Set());
  areAllRoutesVisible = computed<boolean>(() => {
    return this.hiddenRouteIds().size === 0;
  });
  newIndoorRoutes: IndoorRouteDto[] = [];
  pathsMap = new Map<
    string | number,
    {
      points: TopoPoint[];
      color?: string;
      width?: number;
      type?: 'line' | 'circle';
      isTraverse?: boolean;
      _ref: TopoRouteWithRoute;
    }
  >();
  lineWidth = signal(5);
  protected pathsVersion = signal(0);

  protected readonly selectedRoutePathType = computed<'line' | 'circle'>(() => {
    this.pathsVersion();
    const selected = this.selectedRoute();
    if (!selected) return 'line';
    const path = this.pathsMap.get(selected.route_id);
    return (path?.type as 'line' | 'circle') || 'line';
  });

  protected readonly selectedRouteIsTraverse = computed<boolean>(() => {
    this.pathsVersion();
    const selected = this.selectedRoute();
    if (!selected) return false;
    const path = this.pathsMap.get(selected.route_id);
    return path?.isTraverse || false;
  });

  protected setSelectedRoutePathType(type: 'line' | 'circle'): void {
    const selected = this.selectedRoute();
    if (!selected) return;
    const current = this.pathsMap.get(selected.route_id);
    if (current) {
      current.type = type;
    } else {
      this.pathsMap.set(selected.route_id, {
        points: [],
        type,
        _ref: selected,
      });
    }
    if (selected.path) {
      selected.path.type = type;
    }
    const matchingTopoRoute = this.topoRoutes.find(
      (r) => r.route_id === selected.route_id,
    );
    if (matchingTopoRoute?.path) {
      matchingTopoRoute.path.type = type;
    }
    this.pathsVersion.update((v) => v + 1);
    this.cdr.markForCheck();
  }

  protected toggleSelectedRouteTraverse(): void {
    const selected = this.selectedRoute();
    if (!selected) return;
    const current = this.pathsMap.get(selected.route_id);
    let nextVal = false;
    if (current) {
      current.isTraverse = !current.isTraverse;
      nextVal = current.isTraverse;
    } else {
      nextVal = true;
      this.pathsMap.set(selected.route_id, {
        points: [],
        type: 'circle',
        isTraverse: true,
        _ref: selected,
      });
    }
    if (selected.path) {
      selected.path.isTraverse = nextVal;
    }
    const matchingTopoRoute = this.topoRoutes.find(
      (r) => r.route_id === selected.route_id,
    );
    if (matchingTopoRoute) {
      if (!matchingTopoRoute.path) {
        matchingTopoRoute.path = {
          points: [],
          type: current?.type || 'circle',
          isTraverse: nextVal,
        };
      } else {
        matchingTopoRoute.path.isTraverse = nextVal;
      }
    }
    this.pathsVersion.update((v) => v + 1);
    this.cdr.markForCheck();
  }

  width = signal(0);
  height = signal(0);
  viewBox = computed(() => `0 0 ${this.width()} ${this.height()}`);

  protected readonly routeStrokeWidthMap = computed(() => {
    this.pathsVersion();
    const selected = this.selectedRoute();
    const lw = this.lineWidth();
    const map: Record<string, number | undefined> = {};
    for (const [key] of this.pathsMap) {
      const isSelected = String(selected?.route_id) === String(key);
      map[String(key)] = getRouteStrokeWidth(isSelected, false, lw, 'editor');
    }
    return map;
  });

  protected readonly routeStyleMap = computed(() => {
    this.pathsVersion();
    const selected = this.selectedRoute();
    const map: Record<
      string,
      ReturnType<typeof getRouteStyleProperties> | undefined
    > = {};
    for (const [key, entry] of this.pathsMap) {
      const isSelected = String(selected?.route_id) === String(key);
      map[String(key)] = getRouteStyleProperties(
        isSelected,
        false,
        entry._ref?.route?.grade,
        entry._ref?.route?.color || entry.color || entry._ref?.path?.color,
      );
    }
    return map;
  });

  protected readonly pathsEntries = computed(() => {
    this.pathsVersion();
    return Array.from(this.pathsMap.entries());
  });

  protected readonly pointsStringMap = computed(() => {
    this.pathsVersion();
    const w = this.width();
    const h = this.height();
    const map: Record<string, string> = {};
    for (const [key, entry] of this.pathsMap) {
      map[key] = getPointsStringUtil(entry.points, w, h);
    }
    return map;
  });

  draggingPoint: { routeId: string | number; index: number } | null = null;
  scale = signal(1);
  translateX = signal(0);
  translateY = signal(0);
  isPanning = signal(false);

  // Zoom/Pan state adapter
  private readonly zoomPanState = {
    scale: this.scale,
    translateX: this.translateX,
    translateY: this.translateY,
  };

  transform = computed(
    () =>
      `translate(${this.translateX()}px, ${this.translateY()}px) scale(${this.scale()})`,
  );

  constructor() {
    this.topoRoutes = [...this.context.data.topoRoutes];
    // Initialize paths from existing data
    this.topoRoutes.forEach((tr) => {
      if (tr.path) {
        if (tr.path.width) {
          this.lineWidth.set(tr.path.width);
        }
        this.pathsMap.set(tr.route_id, {
          points: [...tr.path.points],
          color: tr.path.color,
          width: tr.path.width,
          type: tr.path.type || 'line',
          isTraverse: tr.path.isTraverse || false,
          _ref: tr,
        });
      }
    });
  }

  ngAfterViewInit(): void {
    this.doAttachWheelListener();
  }

  private readonly destroyRef = inject(DestroyRef);

  private doAttachWheelListener(): void {
    const cleanup = attachWheelListener(
      this.editorAreaElement()?.nativeElement,
      (e) => this.onWheel(e),
    );
    this.destroyRef.onDestroy(() => cleanup());
  }

  onImageLoad(): void {
    const img = this.imageElement().nativeElement;
    const area = this.editorAreaElement().nativeElement;

    // Use natural dimensions for the coordinate system
    this.width.set(img.naturalWidth);
    this.height.set(img.naturalHeight);

    // Calculate initial fit scale
    const scaleX = area.clientWidth / img.naturalWidth;
    const scaleY = area.clientHeight / img.naturalHeight;
    const initialScale = Math.min(scaleX, scaleY, 1);

    this.scale.set(initialScale);
    this.translateX.set(0);
    this.translateY.set(0);
    this.doConstrainTranslation();

    // Try attaching again if not attached yet
    this.doAttachWheelListener();
  }

  resetZoom(): void {
    this.onImageLoad(); // Re-fit
  }

  onWheel(event: Event): void {
    handleWheelZoom(
      event,
      this.zoomPanState,
      this.containerElement().nativeElement,
      {},
      { afterZoom: () => this.doConstrainTranslation() },
    );
  }

  async sortByPosition(): Promise<void> {
    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('topos.editor.sort'),
        size: 's',
        data: {
          content: this.translate.instant('topos.editor.sortConfirm'),
          yes: this.translate.instant('apply'),
          no: this.translate.instant('cancel'),
        },
      }),
      { defaultValue: false },
    );

    if (!confirmed) return;

    this.loading.set(true);

    try {
      // 1. Calculate minX for each route
      const routesWithX = this.topoRoutes.map((tr) => {
        const pathData = this.pathsMap.get(tr.route_id);
        const points = pathData?.points || tr.path?.points || [];
        const minX =
          points.length > 0 ? Math.min(...points.map((p) => p.x)) : 999;
        return { tr, minX };
      });

      // 2. Sort by minX
      routesWithX.sort((a, b) => a.minX - b.minX);

      // 3. Update numbers locally (starting from 0)
      for (let i = 0; i < routesWithX.length; i++) {
        const tr = routesWithX[i].tr;
        tr.number = i;
      }

      // 4. Sort the original array to reflect changes in sidebar
      this.topoRoutes = [...this.topoRoutes].sort(
        (a, b) => a.number - b.number,
      );

      this.toast.success('messages.toasts.routeUpdated');
      this.cdr.markForCheck();
    } catch (error) {
      console.error('[TopoEditor] Error sorting routes', error);
      this.toast.error('messages.toasts.pathsSaveError');
    } finally {
      this.loading.set(false);
    }
  }

  private doConstrainTranslation(): void {
    constrainTranslation(
      this.zoomPanState,
      {
        area: this.editorAreaElement().nativeElement,
        container: this.containerElement().nativeElement,
      },
      this.width(),
      this.height(),
    );
  }

  toggleRouteVisibility(routeId: string | number, event?: Event): void {
    if (event) event.stopPropagation();
    this.hiddenRouteIds.update((set) => {
      const next = new Set(set);
      if (next.has(routeId)) {
        next.delete(routeId);
      } else {
        next.add(routeId);
      }
      return next;
    });
  }

  toggleAllRoutesVisibility(): void {
    if (this.areAllRoutesVisible()) {
      const allIds = this.topoRoutes.map((tr) => tr.route_id);
      this.hiddenRouteIds.set(new Set(allIds));
    } else {
      this.hiddenRouteIds.set(new Set());
    }
  }

  async createNewIndoorRoute(): Promise<void> {
    const centerId = this.context.data.centerId;
    if (!centerId) return;

    const currentTopoId = this.context.data.topoId
      ? String(this.context.data.topoId)
      : undefined;

    const result = await this.indoor.openIndoorRouteForm(centerId, undefined, {
      hideTopo: true,
      defaultTopoId: currentTopoId,
    });
    if (result && typeof result === 'object') {
      const newRoute = result as IndoorRouteDto;
      const newTopoRoute: TopoRouteWithRoute = {
        topo_id: currentTopoId ?? 0,
        route_id: newRoute.id,
        number: this.topoRoutes.length + 1,
        path: null,
        route: newRoute as unknown as RouteBasicWithOwnData,
      };
      this.topoRoutes = [...this.topoRoutes, newTopoRoute];
      this.newIndoorRoutes.push(newRoute);
      this.pathsMap.set(newRoute.id, {
        points: [],
        type: 'line',
        _ref: newTopoRoute,
      });
      this.pathsVersion.update((v) => v + 1);
      this.selectRoute(newTopoRoute, true);
      this.hiddenRouteIds.update((set) => {
        const next = new Set(set);
        next.delete(newRoute.id);
        return next;
      });
      this.cdr.markForCheck();
    }
  }

  async editRoute(tr: TopoRouteWithRoute, event?: Event): Promise<void> {
    if (event) {
      event.stopPropagation();
    }

    if (this.context.data.isIndoor) {
      const centerId =
        this.context.data.centerId ||
        (tr.route as unknown as IndoorRouteDto)?.center_id;
      if (!centerId) return;

      const currentTopoId = this.context.data.topoId
        ? String(this.context.data.topoId)
        : undefined;

      const result = await this.indoor.openIndoorRouteForm(
        centerId,
        tr.route as unknown as IndoorRouteDto,
        {
          hideTopo: true,
          defaultTopoId: currentTopoId,
        },
      );

      if (result) {
        const updated =
          typeof result === 'object' ? (result as IndoorRouteDto) : null;

        if (updated) {
          tr.route.name = updated.name;
          tr.route.grade = updated.grade ?? tr.route.grade;
          tr.route.climbing_kind = (updated.climbing_kind ??
            tr.route.climbing_kind) as ClimbingKind;
          tr.route.color = updated.color;
          const idx = this.newIndoorRoutes.findIndex(
            (r) => r.id === tr.route_id,
          );
          if (idx !== -1) {
            this.newIndoorRoutes[idx] = updated;
          }
        } else {
          const { data } = await this.supabase.client
            .from('indoor_routes')
            .select('id, name, grade, climbing_kind, color')
            .eq('id', String(tr.route_id))
            .single();
          if (data) {
            tr.route.name = data.name;
            tr.route.grade = data.grade ?? tr.route.grade;
            tr.route.climbing_kind = (data.climbing_kind ??
              tr.route.climbing_kind) as ClimbingKind;
            tr.route.color = data.color;
          }
        }

        const pathEntry = this.pathsMap.get(tr.route_id);
        if (pathEntry) {
          pathEntry._ref = tr;
        }
        this.pathsVersion.update((v) => v + 1);

        if (this.selectedRoute()?.route_id === tr.route_id) {
          this.selectedRoute.set({ ...tr });
        }
        this.cdr.markForCheck();
      }
    } else {
      const cragId = (tr.route as unknown as { crag_id?: number }).crag_id;
      const result = await this.routesService.openRouteForm({
        cragId,
        routeData: {
          id: Number(tr.route_id),
          crag_id: cragId,
          name: tr.route.name,
          slug: tr.route.slug,
          grade: tr.route.grade,
          climbing_kind: tr.route.climbing_kind,
          height: (tr.route as unknown as { height?: number | null }).height,
        },
      });

      if (result) {
        const { data } = await this.routesService.getById(Number(tr.route_id));
        if (data) {
          tr.route.name = data.name;
          tr.route.grade = data.grade ?? tr.route.grade;
          tr.route.climbing_kind = (data.climbing_kind ??
            tr.route.climbing_kind) as ClimbingKind;
          tr.route.slug = data.slug;
          if ('height' in data) {
            (tr.route as unknown as { height?: number | null }).height =
              data.height;
          }
        }

        const pathEntry = this.pathsMap.get(tr.route_id);
        if (pathEntry) {
          pathEntry._ref = tr;
        }
        this.pathsVersion.update((v) => v + 1);

        if (this.selectedRoute()?.route_id === tr.route_id) {
          this.selectedRoute.set({ ...tr });
        }
        this.cdr.markForCheck();
      }
    }
  }

  selectRoute(tr: TopoRouteWithRoute, fromList = false): void {
    const selected = this.selectedRoute();

    if (fromList) {
      if (selected?.route_id === tr.route_id) {
        this.selectedRoute.set(null);
      } else {
        this.selectedRoute.set(tr);
        if (this.hiddenRouteIds().has(tr.route_id)) {
          this.hiddenRouteIds.update((set) => {
            const next = new Set(set);
            next.delete(tr.route_id);
            return next;
          });
        }
        // Center the view on the newly selected route
        this.centerOnRoute(tr);
      }
    } else {
      if (!selected) {
        this.selectedRoute.set(tr);
        if (this.hiddenRouteIds().has(tr.route_id)) {
          this.hiddenRouteIds.update((set) => {
            const next = new Set(set);
            next.delete(tr.route_id);
            return next;
          });
        }
        this.centerOnRoute(tr);
      }
    }
  }

  private centerOnRoute(tr: TopoRouteWithRoute): void {
    const path = this.pathsMap.get(tr.route_id);
    if (!path || !path.points || path.points.length === 0) return;

    const pts = path.points;
    const minX = Math.min(...pts.map((p) => p.x));
    const maxX = Math.max(...pts.map((p) => p.x));
    const minY = Math.min(...pts.map((p) => p.y));
    const maxY = Math.max(...pts.map((p) => p.y));
    const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };

    // Ensure we are zoomed in enough to see the route clearly,
    // but don't force a zoom-out if already zoomed in.
    if (this.scale() < 1) {
      this.scale.set(1);
    }

    this.centerOnPoint(center);
  }

  private centerOnPoint(point: { x: number; y: number }): void {
    const areaEl = this.editorAreaElement()?.nativeElement;
    const containerEl = this.containerElement()?.nativeElement;
    if (!areaEl || !containerEl) return;

    const areaRect = areaEl.getBoundingClientRect();
    const scale = this.scale();
    const baseW = this.width();
    const baseH = this.height();

    // The container might have its own resting offset (though usually 0 in this editor)
    const restingLeft = containerEl.offsetLeft;
    const restingTop = containerEl.offsetTop;

    // We want the point (point.x * baseW * scale) to be at areaRect.width / 2
    let targetX = areaRect.width / 2 - restingLeft - point.x * baseW * scale;
    let targetY = areaRect.height / 2 - restingTop - point.y * baseH * scale;

    // Apply constraints similar to constrainTranslation util
    const scaledW = baseW * scale;
    const scaledH = baseH * scale;

    if (scaledW > areaRect.width) {
      const minX = -restingLeft - (scaledW - areaRect.width);
      const maxX = -restingLeft;
      targetX = Math.max(minX, Math.min(targetX, maxX));
    } else {
      targetX = (areaRect.width - scaledW) / 2 - restingLeft;
    }

    if (scaledH > areaRect.height) {
      const minY = -restingTop - (scaledH - areaRect.height);
      const maxY = -restingTop;
      targetY = Math.max(minY, Math.min(targetY, maxY));
    } else {
      targetY = (areaRect.height - scaledH) / 2 - restingTop;
    }

    this.translateX.set(targetX);
    this.translateY.set(targetY);
    this.cdr.markForCheck();
  }

  onImageClick(event: Event): void {
    const mouseEvent = event as MouseEvent;
    if (mouseEvent.button !== 0 || this.draggingPoint) return;

    setupEditorMousePan(
      mouseEvent,
      this.zoomPanState,
      {},
      {
        onNoMove: (e) => this.addPoint(e),
        afterMove: () => this.doConstrainTranslation(),
      },
    );
  }

  private lastTapTime = 0;
  private lastTapIndex = -1;
  private lastTapRouteId: string | number | null = null;

  cyclePointState(event: Event, routeId: string | number, index: number): void {
    event.stopPropagation();
    event.preventDefault();
    const parsedRouteId = isNaN(Number(routeId)) ? routeId : Number(routeId);
    const pathData = this.pathsMap.get(parsedRouteId);
    if (!pathData || !pathData.points[index]) return;

    pathData.points[index].state = cyclePointState(
      pathData.points[index].state,
    );
    this.pathsMap.set(parsedRouteId, { ...pathData });
    this.pathsVersion.update((v) => v + 1);
    this.cdr.markForCheck();
  }

  private addPoint(event: MouseEvent): void {
    const route = this.selectedRoute();
    if (!route) return;

    addPointToPath(
      event,
      route.route_id,
      this.containerElement().nativeElement,
      this.pathsMap,
      { _ref: route },
    );
    this.pathsVersion.update((v) => v + 1);
    this.cdr.markForCheck();
  }

  startDragging(
    event: MouseEvent,
    routeId: string | number,
    index: number,
  ): void {
    const parsedRouteId = isNaN(Number(routeId)) ? routeId : Number(routeId);
    this.draggingPoint = { routeId: parsedRouteId, index };

    startDragPointMouse(
      event,
      parsedRouteId,
      index,
      this.containerElement().nativeElement,
      this.pathsMap,
      {
        onUpdate: () => {
          this.pathsVersion.update((v) => v + 1);
          this.cdr.markForCheck();
        },
        onEnd: () => {
          this.draggingPoint = null;
          this.pathsVersion.update((v) => v + 1);
          this.cdr.markForCheck();
        },
      },
    );
  }

  startDraggingTouch(
    event: TouchEvent,
    routeId: string | number,
    index: number,
  ): void {
    const parsedRouteId = isNaN(Number(routeId)) ? routeId : Number(routeId);
    const now = Date.now();
    if (
      this.lastTapRouteId === parsedRouteId &&
      this.lastTapIndex === index &&
      now - this.lastTapTime < 350
    ) {
      this.cyclePointState(event, parsedRouteId, index);
      this.lastTapTime = 0;
      this.lastTapIndex = -1;
      this.lastTapRouteId = null;
      return;
    }
    this.lastTapTime = now;
    this.lastTapIndex = index;
    this.lastTapRouteId = parsedRouteId;

    this.draggingPoint = { routeId: parsedRouteId, index };

    startDragPointTouch(
      event,
      parsedRouteId,
      index,
      this.containerElement().nativeElement,
      this.pathsMap,
      {
        onLongPress: () => {
          this.removePoint(event, parsedRouteId, index);
          this.draggingPoint = null;
        },
        onUpdate: () => {
          this.pathsVersion.update((v) => v + 1);
          this.cdr.markForCheck();
        },
        onEnd: () => {
          this.draggingPoint = null;
          this.pathsVersion.update((v) => v + 1);
        },
      },
    );
  }

  onTouchStart(event: Event): void {
    setupEditorTouchPanPinch(
      event,
      this.zoomPanState,
      this.containerElement().nativeElement,
      {},
      {
        afterMove: () => this.doConstrainTranslation(),
        isDraggingPoint: () => !!this.draggingPoint,
      },
    );
  }

  dropRoute(event: CdkDragDrop<TopoRouteWithRoute[]>): void {
    moveItemInArray(this.topoRoutes, event.previousIndex, event.currentIndex);
    // Reassign numbers based on new order (1-based)
    this.topoRoutes.forEach((tr, i) => {
      tr.number = i + 1;
    });
    this.topoRoutes = [...this.topoRoutes];
    this.cdr.markForCheck();
  }

  removePoint(event: Event, routeId: string | number, index: number): void {
    removePoint(event, routeId, index, this.pathsMap);
    this.pathsVersion.update((v) => v + 1);
    this.cdr.markForCheck();
  }

  async removePath(tr: TopoRouteWithRoute): Promise<void> {
    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('delete'),
        size: 's',
        data: {
          content: this.translate.instant('topos.editor.removePathConfirm'),
          yes: this.translate.instant('delete'),
          no: this.translate.instant('cancel'),
          appearance: 'primary-destructive',
        },
      }),
      { defaultValue: false },
    );
    if (confirmed) {
      this.pathsMap.delete(tr.route_id);
      this.pathsMap = new Map(this.pathsMap);
      this.pathsVersion.update((v) => v + 1);
      this.selectedRoute.set(null);
      this.cdr.markForCheck();
    }
  }

  close(): void {
    if (this.newIndoorRoutes.length > 0) {
      const idsToDelete = this.newIndoorRoutes.map((r) => r.id);
      void Promise.all(idsToDelete.map((id) => this.indoor.deleteRoute(id)));
    }
    this.context.completeWith(false);
  }

  async saveAll(): Promise<void> {
    this.loading.set(true);
    try {
      const pathsToUpdate = Array.from(this.pathsMap.entries()).map(
        ([routeId, path]) => ({
          routeId,
          path: {
            points: path.points,
            color: path.color,
            width: this.lineWidth(),
            type: path.type || 'line',
            isTraverse: path.isTraverse || false,
          } as TopoPath,
        }),
      );

      if (!this.context.data.standalone) {
        // Return paths to caller
        this.context.completeWith({
          saved: true,
          paths: pathsToUpdate,
          routeIds: this.topoRoutes.map((tr) => tr.route_id),
          newIndoorRoutes: this.newIndoorRoutes,
        });
        return;
      }

      const topoId = this.context.data.topoId;
      if (!topoId) throw new Error('Missing topoId for database saving');

      if (this.context.data.isIndoor) {
        const pathsMap = new Map(
          pathsToUpdate.map((p) => [String(p.routeId), p.path]),
        );
        const upsertPromises = this.topoRoutes.map((tr, idx) => {
          const path = pathsMap.get(String(tr.route_id)) || null;
          return this.supabase.client.from('indoor_topo_routes').upsert({
            topo_id: String(topoId),
            route_id: String(tr.route_id),
            number: idx,
            path: path ? topoPathToJson(path) : null,
          });
        });
        const upsertResults = await Promise.all(upsertPromises);
        const upsertErr = upsertResults.find((r) => r.error)?.error;
        if (upsertErr) throw upsertErr;

        const routeIds = this.topoRoutes.map((tr) => String(tr.route_id));
        if (routeIds.length > 0) {
          const { error: updateErr } = await this.supabase.client
            .from('indoor_routes')
            .update({ topo_id: String(topoId) })
            .in('id', routeIds);
          if (updateErr) throw updateErr;
        }

        this.newIndoorRoutes = [];
        this.indoorData.topoDetailResource.reload();
        this.indoor.reloadCenterRoutes();
      } else {
        if (pathsToUpdate.length > 0) {
          await this.topos.bulkUpdateRoutePaths(topoId, pathsToUpdate, false);
        }

        for (let i = 0; i < this.topoRoutes.length; i++) {
          const tr = this.topoRoutes[i];
          await this.topos.updateRouteOrder(topoId, tr.route_id, i, false);
        }
      }

      this.toast.success('messages.toasts.pathsSaved');
      this.context.completeWith(true);
    } catch (error) {
      console.error('Error saving paths:', error);
      this.toast.error('messages.errors.savingPaths');
    } finally {
      this.loading.set(false);
    }
  }
}
