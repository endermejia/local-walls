import { FormsModule } from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  InputSignal,
  linkedSignal,
  PLATFORM_ID,
  resource,
  signal,
  Signal,
  viewChild,
  viewChildren,
} from '@angular/core';

import { TuiDialogService } from '@taiga-ui/core';
import {
  TUI_CONFIRM,
  TuiAvatar,
  type TuiConfirmData,
  TuiInputNumber,
} from '@taiga-ui/kit';
import {
  TuiButton,
  TuiDataList,
  TuiIcon,
  TuiLink,
  TuiLoader,
  TuiScrollbar,
  TuiCell,
  TuiInput,
} from '@taiga-ui/core';
import {
  TuiSortDirection,
  TuiTable,
  TuiTableTbody,
  TuiTableThGroup,
  TuiTableTh,
  TuiTableTr,
  TuiTableTd,
  TuiTableHead,
  TuiTableCell,
  TuiTableSortChange,
} from '@taiga-ui/addon-table';
import type { TuiComparator } from '@taiga-ui/addon-table/types';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import { AscentsService } from '../../services/ascents.service';
import { GlobalData } from '../../services/global-data';
import { RoutesService } from '../../services/routes.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { ToposService } from '../../services/topos.service';

import { EmptyStateComponent } from '../../components/ui/empty-state';
import { GradeComponent } from '../../components/ui/avatar-grade';
import { PaywallComponent } from '../../components/paywall/paywall';
import { SectionHeaderComponent } from '../../components/ui/section-header';

import {
  RouteAscentWithExtras,
  RouteWithExtras,
  TopoDetail,
  TopoRouteWithRoute,
} from '../../models';

import { GradeLabelPipe } from '../../pipes/grade-label.pipe';
import { IconSrcPipe } from '../../pipes/icon-src.pipe';
import { ShadeInfoPipe } from '../../pipes/shade-info.pipe';
import { AscentInfoPipe } from '../../pipes/ascent-info.pipe';
import { TableSorterPipe } from '../../pipes/table-sorter.pipe';
import { handleErrorToast } from '../../utils';
import {
  getRouteStyleProperties,
  getRouteStrokeWidth,
  getPointsString as getPointsStringUtil,
} from '../../utils/topo-styles.utils';
import {
  ViewerZoomPanState,
  ViewerDragState,
  ViewerElements,
  createViewerDragState,
  handleViewerWheelZoom,
  handleViewerTouchStart,
  handleViewerTouchMove,
  handleViewerMouseDown,
  handleViewerMouseMove,
  centerViewerOnPoint,
} from '../../utils/zoom-pan.utils';

export interface TopoRouteRow {
  index: number;
  name: string;
  grade: number;
  height: number | null;
  slug: string;
  link: string[];
  climbed: boolean;
  project: boolean;
  _ref: TopoRouteWithRoute;
}

@Component({
  selector: 'app-topo',
  imports: [
    EmptyStateComponent,
    FormsModule,
    GradeComponent,
    GradeLabelPipe,
    IconSrcPipe,
    ShadeInfoPipe,
    PaywallComponent,
    RouterLink,
    SectionHeaderComponent,
    TranslatePipe,
    AscentInfoPipe,
    TableSorterPipe,
    TuiAvatar,
    TuiButton,
    TuiCell,
    TuiDataList,
    TuiIcon,
    TuiInput,
    TuiInputNumber,
    TuiLink,
    TuiLoader,
    TuiScrollbar,
    TuiTable,
    TuiTableTbody,
    TuiTableThGroup,
    TuiTableTh,
    TuiTableTr,
    TuiTableTd,
    TuiTableHead,
    TuiTableCell,
  ],
  template: `
    <div class="h-full w-full">
      <section class="flex flex-col w-full h-full md:p-4">
        @let isMobile = global.isMobile();
        @let canEditAsAdmin = global.canEditAsAdmin();
        @if (topo(); as t) {
          @let canAreaAdmin =
            t.crag
              ? global.areaAdminPermissions()[t.crag.area_id || -1]
              : false;
          <div class="mb-4 p-4 md:p-0">
            <app-section-header
              [title]="t.name"
              [showLike]="false"
              [titleDropdown]="topoDropdown"
            >
              <!-- Shade info as title additional info -->
              <ng-container titleInfo>
                @if (t | shadeInfo; as info) {
                  <tui-icon [icon]="info.icon" class="text-2xl opacity-70" />
                }
              </ng-container>

              <ng-template #topoDropdown>
                <tui-data-list>
                  @for (item of sortedAreaTopos(); track item.id) {
                    <button
                      tuiOption
                      new
                      type="button"
                      [disabled]="item.id === t.id"
                      (click.zoneless)="navigateToTopo(item)"
                    >
                      {{ item.name }}
                    </button>
                  }
                </tui-data-list>
              </ng-template>

              <!-- Admin and utility action buttons -->
              <div actionButtons class="flex gap-2">
                @if (global.canEditCrag()) {
                  <button
                    tuiIconButton
                    size="s"
                    appearance="neutral"
                    iconStart="@tui.square-pen"
                    class="rounded-full!"
                    (click.zoneless)="openEditTopo(t)"
                  >
                    {{ 'edit' | translate }}
                  </button>
                  @if (canEditAsAdmin || canAreaAdmin) {
                    <button
                      tuiIconButton
                      size="s"
                      appearance="negative"
                      iconStart="@tui.trash"
                      class="rounded-full!"
                      (click.zoneless)="deleteTopo(t)"
                    >
                      {{ 'delete' | translate }}
                    </button>
                  }
                }
              </div>
            </app-section-header>
          </div>

          @let isPublic = t.crag?.area?.is_public;
          @let purchased = t.crag?.area?.purchased;
          @let isCreator = t.crag?.user_creator_id === global.userProfile()?.id;
          @let hasAccess =
            isPublic ||
            purchased ||
            canEditAsAdmin ||
            canAreaAdmin ||
            isCreator;

          <div
            class="grid grid-cols-1 grid-rows-2 lg:grid-cols-3 lg:grid-rows-1 w-full h-full gap-4 overflow-hidden"
          >
            <!-- Topo image container -->
            @let topoImage = topoImageResource.value();
            <div
              class="relative w-full h-full lg:col-span-2 bg-(--tui-background-neutral-1) md:rounded-xl md:border md:border-(--tui-border-normal) overflow-hidden cursor-grab active:cursor-grabbing touch-none"
              #scrollContainer
              (wheel.zoneless)="onWheel($event)"
              (touchstart.zoneless)="onTouchStart($any($event))"
              (touchmove.zoneless)="onTouchMove($any($event))"
              (touchend.zoneless)="onTouchEnd()"
              (mousedown.zoneless)="onMouseDown($any($event))"
              (mousemove.zoneless)="onMouseMove($any($event))"
              (mouseup.zoneless)="onMouseUp()"
              (mouseleave.zoneless)="onMouseUp()"
            >
              <div
                class="h-full w-full flex items-center justify-center min-w-full"
              >
                <div
                  #zoomContainerNormal
                  class="relative h-full transition-transform duration-75 ease-out zoom-container origin-top-left"
                  [class.duration-0!]="dragState.isDragging"
                  [style.transform]="
                    'translate(' +
                    zoomPosition().x +
                    'px, ' +
                    zoomPosition().y +
                    'px) scale(' +
                    zoomScale() +
                    ')'
                  "
                  (click.zoneless)="onImageClick()"
                >
                  <img
                    #topoImgNormal
                    [src]="topoImage || ('topo' | iconSrc)"
                    [alt]="t.name"
                    class="w-auto h-full max-w-none block object-cover"
                    draggable="false"
                    decoding="async"
                    tabindex="0"
                    (keydown.enter)="toggleFullscreen(!!topoImage)"
                    (load)="onImageLoad($event)"
                  />
                  <!-- SVG Paths Overlay -->
                  @if (topoImage && hasAccess) {
                    @let ratio = imageRatio();
                    @let hScale = 1000 / ratio;
                    <svg
                      class="absolute inset-0 w-full h-full pointer-events-none"
                      [attr.viewBox]="'0 0 1000 ' + hScale"
                      preserveAspectRatio="none"
                    >
                      <!-- Layer 1: Hit Areas (Bottom) -->
                      @for (tr of renderedTopoRoutes(); track tr.route_id) {
                        @if (tr.path && tr.path.points.length > 0) {
                          <polyline
                            class="pointer-events-auto cursor-pointer"
                            (click)="
                              onPathClick($event, tr); $event.stopPropagation()
                            "
                            (mouseenter)="hoveredRouteId.set(tr.route_id)"
                            (mouseleave)="hoveredRouteId.set(null)"
                            [attr.points]="tr.pointsString"
                            fill="none"
                            stroke="transparent"
                            [attr.stroke-width]="
                              (selectedRouteId() === tr.route_id
                                ? 0.06
                                : 0.025) * 1000
                            "
                            stroke-linejoin="round"
                            stroke-linecap="round"
                          />
                        }
                      }

                      <!-- Layer 2: Visuals (Lines) -->
                      @for (tr of renderedTopoRoutes(); track tr.route_id) {
                        @if (tr.path && tr.path.points.length > 0) {
                          <!-- Border/Shadow Line -->
                          <polyline
                            [attr.points]="tr.pointsString"
                            fill="none"
                            stroke="white"
                            [style.opacity]="tr.style.isDashed ? 1 : 0.7"
                            [attr.stroke-width]="
                              tr.width * 1000 + (tr.style.isDashed ? 2.5 : 1.5)
                            "
                            [attr.stroke-dasharray]="
                              tr.style.isDashed ? '10, 10' : 'none'
                            "
                            stroke-linejoin="round"
                            stroke-linecap="round"
                            class="transition-all duration-300"
                          />

                          <!-- Main Line -->
                          <polyline
                            [attr.points]="tr.pointsString"
                            fill="none"
                            [attr.stroke]="tr.style.stroke"
                            [style.opacity]="tr.style.opacity"
                            [attr.stroke-width]="tr.width * 1000"
                            [attr.stroke-dasharray]="
                              tr.style.isDashed ? '10, 10' : 'none'
                            "
                            stroke-linejoin="round"
                            stroke-linecap="round"
                            class="transition-all duration-300"
                          />

                          <!-- End Circle (Small White) -->
                          @if (
                            tr.path.points[tr.path.points.length - 1];
                            as last
                          ) {
                            <circle
                              [attr.cx]="last.x * 1000"
                              [attr.cy]="last.y * hScale"
                              [attr.r]="tr.width * 1000"
                              fill="white"
                              [style.opacity]="tr.style.opacity"
                              stroke="black"
                              [attr.stroke-width]="0.5"
                            />
                          }
                        }
                      }

                      <!-- Layer 3: Indicators (Top) -->
                      @for (tr of renderedTopoRoutes(); track tr.route_id) {
                        @if (tr.path && tr.path.points.length > 0) {
                          @if (tr.path.points[0]; as first) {
                            <circle
                              class="pointer-events-auto cursor-pointer"
                              (click)="
                                onPathClick($event, tr);
                                $event.stopPropagation()
                              "
                              (mouseenter)="hoveredRouteId.set(tr.route_id)"
                              (mouseleave)="hoveredRouteId.set(null)"
                              [attr.cx]="first.x * 1000"
                              [attr.cy]="first.y * hScale"
                              [attr.r]="tr.width * 2000"
                              [attr.fill]="tr.style.stroke"
                              stroke="white"
                              stroke-width="1"
                            />
                            <text
                              class="pointer-events-none"
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
                        }
                      }
                    </svg>
                  }
                </div>
              </div>
            </div>
            <!-- Topo fullscreen -->
            @if (isFullscreen()) {
              <div
                #fullscreenContainer
                class="fixed inset-0 z-1000 flex items-center justify-center overflow-hidden touch-none backdrop-blur-xl cursor-grab active:cursor-grabbing"
                tabindex="0"
                (keydown.enter)="toggleFullscreen(false)"
                (click)="toggleFullscreen(false)"
                (wheel.zoneless)="onWheel($any($event))"
                (touchstart.zoneless)="onTouchStart($any($event))"
                (touchmove.zoneless)="onTouchMove($any($event))"
                (touchend.zoneless)="onTouchEnd()"
                (mousedown.zoneless)="onMouseDown($any($event))"
                (mousemove.zoneless)="onMouseMove($any($event))"
                (mouseup.zoneless)="onMouseUp()"
                (mouseleave.zoneless)="onMouseUp()"
                (window:keydown.arrowLeft)="selectPrevRoute()"
                (window:keydown.arrowRight)="selectNextRoute()"
                (window:keydown.escape)="toggleFullscreen(false)"
              >
                <!-- Close button -->
                <div class="absolute top-4 right-4 z-1001">
                  <button
                    tuiIconButton
                    appearance="floating"
                    [size]="isMobile ? 'm' : 'l'"
                    class="bg-(--tui-background-base)"
                    (click)="toggleFullscreen(false); $event.stopPropagation()"
                  >
                    <tui-icon icon="@tui.x" />
                  </button>
                </div>

                <div
                  #fullscreenZoomContainer
                  class="relative transition-transform duration-75 ease-out zoom-container origin-top-left"
                  [class.duration-0!]="dragState.isDragging"
                  (click)="onImageClick(); $event.stopPropagation()"
                  (keydown.enter)="$event.stopPropagation()"
                  tabindex="-1"
                  [style.transform]="
                    'translate(' +
                    zoomPosition().x +
                    'px, ' +
                    zoomPosition().y +
                    'px) scale(' +
                    zoomScale() +
                    ')'
                  "
                >
                  <img
                    #topoImgFullscreen
                    [src]="topoImage || ('topo' | iconSrc)"
                    [alt]="t.name"
                    class="w-full h-auto block max-w-none"
                    draggable="false"
                    (load)="onImageLoad($event)"
                  />
                  <!-- SVG Paths Overlay in Fullscreen -->
                  @if (topoImage && hasAccess) {
                    @let ratio = imageRatio();
                    @let hScale = 1000 / ratio;
                    <svg
                      class="absolute inset-0 w-full h-full pointer-events-none"
                      [attr.viewBox]="'0 0 1000 ' + hScale"
                      preserveAspectRatio="none"
                    >
                      <!-- Layer 1: Hit Areas (Bottom) -->
                      @for (tr of renderedTopoRoutes(); track tr.route_id) {
                        @if (tr.path && tr.path.points.length > 0) {
                          <polyline
                            class="pointer-events-auto cursor-pointer"
                            (click)="
                              onPathClick($event, tr); $event.stopPropagation()
                            "
                            (mouseenter)="hoveredRouteId.set(tr.route_id)"
                            (mouseleave)="hoveredRouteId.set(null)"
                            [attr.points]="tr.pointsString"
                            fill="none"
                            stroke="transparent"
                            [attr.stroke-width]="
                              (selectedRouteId() === tr.route_id
                                ? 0.06
                                : 0.025) * 1000
                            "
                            stroke-linejoin="round"
                            stroke-linecap="round"
                          />
                        }
                      }

                      <!-- Layer 2: Visuals (Lines) -->
                      @for (tr of renderedTopoRoutes(); track tr.route_id) {
                        @if (tr.path && tr.path.points.length > 0) {
                          <!-- Border/Shadow Line -->
                          <polyline
                            [attr.points]="tr.pointsString"
                            fill="none"
                            stroke="white"
                            [style.opacity]="tr.style.isDashed ? 1 : 0.7"
                            [attr.stroke-width]="
                              tr.width * 1000 + (tr.style.isDashed ? 2.5 : 1.5)
                            "
                            [attr.stroke-dasharray]="
                              tr.style.isDashed ? '10, 10' : 'none'
                            "
                            stroke-linejoin="round"
                            stroke-linecap="round"
                            class="transition-all duration-300"
                          />

                          <!-- Main Line -->
                          <polyline
                            [attr.points]="tr.pointsString"
                            fill="none"
                            [attr.stroke]="tr.style.stroke"
                            [style.opacity]="tr.style.opacity"
                            [attr.stroke-width]="tr.width * 1000"
                            [attr.stroke-dasharray]="
                              tr.style.isDashed ? '10, 10' : 'none'
                            "
                            stroke-linejoin="round"
                            stroke-linecap="round"
                            class="transition-all duration-300"
                          />

                          <!-- End Circle (Small White) -->
                          @if (
                            tr.path.points[tr.path.points.length - 1];
                            as last
                          ) {
                            <circle
                              [attr.cx]="last.x * 1000"
                              [attr.cy]="last.y * hScale"
                              [attr.r]="tr.width * 1000"
                              fill="white"
                              [style.opacity]="tr.style.opacity"
                              stroke="black"
                              [attr.stroke-width]="0.5"
                            />
                          }
                        }
                      }

                      <!-- Layer 3: Visuals (Indicators/Circles) -->
                      @for (tr of renderedTopoRoutes(); track tr.route_id) {
                        @if (tr.path && tr.path.points.length > 0) {
                          <g
                            class="pointer-events-auto cursor-pointer"
                            (click)="
                              onPathClick($event, tr); $event.stopPropagation()
                            "
                            (mouseenter)="hoveredRouteId.set(tr.route_id)"
                            (mouseleave)="hoveredRouteId.set(null)"
                          >
                            <!-- Start Point: Colored Circle -->
                            @if (tr.path.points[0]; as first) {
                              <circle
                                [attr.cx]="first.x * 1000"
                                [attr.cy]="first.y * hScale"
                                [attr.r]="tr.width * 2000"
                                [attr.fill]="tr.style.stroke"
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
                    </svg>
                  }
                </div>

                <!-- Route Info Tooltip -->
                @if (hasAccess && selectedRouteInfo(); as selectedRoute) {
                  <div
                    class="absolute bottom-6 left-1/2 -translate-x-1/2 bg-(--tui-background-base) border border-(--tui-border-normal) rounded-2xl shadow-2xl p-4 w-[90vw] md:w-auto md:min-w-80 max-w-[95vw] z-10"
                    (click)="$event.stopPropagation()"
                    (keydown.enter)="$event.stopPropagation()"
                    tabindex="-1"
                  >
                    <div class="flex items-center gap-3">
                      <button
                        tuiIconButton
                        appearance="flat"
                        size="s"
                        iconStart="@tui.chevron-left"
                        class="rounded-full!"
                        (click)="selectPrevRoute(); $event.stopPropagation()"
                      >
                        {{ 'previous' | translate }}
                      </button>

                      <div class="flex flex-1 items-center gap-3 min-w-0">
                        <div class="flex-1 min-w-0">
                          <div
                            class="font-bold text-lg wrap-break-word line-clamp-2 text-center"
                          >
                            {{ selectedRoute.route.name }}
                          </div>
                          <div class="mt-2 text-center">
                            <app-grade
                              [grade]="selectedRoute.route.grade"
                              [kind]="selectedRoute.route.climbing_kind"
                              size="m"
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        tuiIconButton
                        appearance="flat"
                        size="s"
                        iconStart="@tui.chevron-right"
                        class="rounded-full! mr-1"
                        (click)="selectNextRoute(); $event.stopPropagation()"
                      >
                        {{ 'next' | translate }}
                      </button>
                    </div>
                  </div>
                }
              </div>
            }

            <!-- Routes table container -->
            <div
              class="w-full h-full overflow-hidden px-4 md:px-0 lg:col-span-1 focus:outline-none"
              tabindex="0"
              (keydown)="onTableKeyDown($event)"
            >
              <tui-scrollbar class="h-full">
                @if (hasAccess) {
                  @let sortedData = sortedTableData();
                  @if (sortedData.length > 0) {
                    <table
                      tuiTable
                      [size]="isMobile ? 's' : 'm'"
                      class="w-full"
                      [class.table-fixed]="isMobile"
                      [columns]="columns()"
                      [direction]="direction()"
                      [sorter]="sorter()"
                      (sortChange)="onSortChange($event)"
                    >
                      <thead tuiThead>
                        <tr tuiThGroup>
                          @for (col of columns(); track col) {
                            <th
                              *tuiHead="col"
                              tuiTh
                              [sorter]="col | tableSorter"
                              [class.text-center]="col !== 'name'"
                              [class.w-10!]="isMobile && col === 'index'"
                              [class.w-12!]="
                                (!isMobile && col === 'index') ||
                                (isMobile && col === 'grade')
                              "
                              [class.w-20!]="!isMobile && col === 'grade'"
                              [class.w-24!]="
                                (isMobile &&
                                  (col === 'actions' ||
                                    col === 'admin_actions')) ||
                                (!isMobile &&
                                  (col === 'height' || col === 'admin_actions'))
                              "
                              [class.w-28!]="!isMobile && col === 'actions'"
                            >
                              <div class="items-center justify-center gap-1">
                                @switch (col) {
                                  @case ('index') {
                                    #
                                  }
                                  @case ('name') {
                                    {{ 'routes.name' | translate }}
                                  }
                                  @case ('grade') {
                                    {{ 'grade' | translate }}
                                  }
                                  @case ('height') {
                                    {{ 'routes.height' | translate }}
                                  }
                                }
                              </div>
                            </th>
                          }
                        </tr>
                      </thead>
                      @for (
                        item of sortedTableData();
                        track item._ref.topo_id + '-' + item._ref.route_id;
                        let i = $index
                      ) {
                        <tbody tuiTbody>
                          <tr
                            #routeRow
                            tuiTr
                            [id]="
                              'route-row-' +
                              item._ref.topo_id +
                              '-' +
                              item._ref.route_id
                            "
                            [class.bg-(--tui-background-accent-1-hover)!]="
                              item._ref.route_id === selectedRouteId()
                            "
                            [style.background]="
                              item.climbed
                                ? (
                                    item._ref.route.own_ascent?.type
                                    | ascentInfo
                                  ).backgroundSubtle
                                : item.project
                                  ? 'var(--tui-status-info-pale)'
                                  : ''
                            "
                            class="group cursor-pointer"
                            (mouseenter)="
                              hoveredRouteId.set(item._ref.route_id)
                            "
                            (mouseleave)="hoveredRouteId.set(null)"
                            (click)="
                              selectedRouteId.set(
                                selectedRouteId() === item._ref.route_id
                                  ? null
                                  : item._ref.route_id
                              )
                            "
                          >
                            @for (col of columns(); track col) {
                              <td
                                *tuiCell="col"
                                tuiTd
                                [class.text-center]="col !== 'name'"
                              >
                                @switch (col) {
                                  @case ('index') {
                                    <div
                                      tuiCell
                                      size="m"
                                      class="justify-center h-full"
                                    >
                                      @if (global.canEditCrag()) {
                                        <tui-textfield
                                          tuiTextfieldSize="s"
                                          [class.w-16!]="!isMobile"
                                          [class.w-10!]="isMobile"
                                          class="h-8!"
                                        >
                                          <input
                                            #indexInput
                                            tuiInputNumber
                                            class="text-center h-full! border-none! p-0! route-index-input"
                                            [ngModel]="item.index + 1"
                                            (blur.zoneless)="
                                              onUpdateRouteNumber(
                                                item._ref,
                                                $any($event.target).value
                                              )
                                            "
                                            (keydown.enter)="
                                              onUpdateRouteNumber(
                                                item._ref,
                                                $any($event.target).value
                                              );
                                              $event.stopPropagation()
                                            "
                                            (keydown)="
                                              onTableKeyDown($event, i)
                                            "
                                            autocomplete="off"
                                          />
                                        </tui-textfield>
                                      } @else {
                                        {{ item.index + 1 }}
                                      }
                                    </div>
                                  }
                                  @case ('name') {
                                    <div tuiCell size="m" class="h-full">
                                      <a
                                        tuiLink
                                        [routerLink]="item.link"
                                        class="text-left"
                                      >
                                        {{ item.name }}
                                      </a>
                                    </div>
                                  }
                                  @case ('grade') {
                                    <div
                                      tuiCell
                                      size="m"
                                      class="justify-center h-full"
                                    >
                                      <app-grade
                                        [grade]="item.grade"
                                        [kind]="item._ref.route.climbing_kind"
                                      />
                                    </div>
                                  }
                                  @case ('height') {
                                    <div
                                      tuiCell
                                      size="m"
                                      class="justify-center h-full"
                                    >
                                      @if (global.canEditCrag()) {
                                        <tui-textfield
                                          tuiTextfieldSize="s"
                                          [class.w-16!]="!isMobile"
                                          [class.w-12!]="isMobile"
                                          class="h-8!"
                                        >
                                          <input
                                            #heightInput
                                            tuiInputNumber
                                            class="text-center h-full! border-none! p-0! route-height-input"
                                            [ngModel]="item.height"
                                            (blur.zoneless)="
                                              onUpdateRouteHeight(
                                                item._ref,
                                                $any($event.target).value
                                              )
                                            "
                                            (keydown.enter)="
                                              onUpdateRouteHeight(
                                                item._ref,
                                                $any($event.target).value
                                              );
                                              $event.stopPropagation()
                                            "
                                            (keydown)="
                                              onTableKeyDown($event, i)
                                            "
                                            autocomplete="off"
                                          />
                                          <span class="tui-textfield__suffix"
                                            >m</span
                                          >
                                        </tui-textfield>
                                      } @else {
                                        {{
                                          item.height ? item.height + 'm' : '-'
                                        }}
                                      }
                                    </div>
                                  }
                                  @case ('actions') {
                                    <div
                                      tuiCell
                                      size="m"
                                      class="justify-center h-full"
                                    >
                                      @if (!item.climbed) {
                                        <button
                                          tuiIconButton
                                          size="m"
                                          appearance="neutral"
                                          iconStart="@tui.circle-plus"
                                          class="rounded-full!"
                                          (click.zoneless)="
                                            onLogAscent(item._ref);
                                            $event.stopPropagation()
                                          "
                                        >
                                          {{ 'ascent.new' | translate }}
                                        </button>
                                      } @else if (
                                        item._ref.route.own_ascent;
                                        as ascentToEdit
                                      ) {
                                        <span
                                          tuiAvatar
                                          class="cursor-pointer text-(--tui-text-primary-on-accent-1)!"
                                          [style.background]="
                                            (ascentToEdit?.type | ascentInfo)
                                              .background
                                          "
                                          tabindex="0"
                                          (click.zoneless)="
                                            onEditAscent(
                                              ascentToEdit,
                                              item.name
                                            );
                                            $event.stopPropagation()
                                          "
                                          (keydown.enter)="
                                            onEditAscent(
                                              ascentToEdit,
                                              item.name
                                            );
                                            $event.stopPropagation()
                                          "
                                        >
                                          <tui-icon
                                            [icon]="
                                              (ascentToEdit?.type | ascentInfo)
                                                .icon
                                            "
                                          />
                                        </span>
                                      }
                                      @if (!item.climbed) {
                                        <button
                                          tuiIconButton
                                          size="m"
                                          [appearance]="
                                            item.project ? 'info' : 'neutral'
                                          "
                                          iconStart="@tui.bookmark"
                                          class="rounded-full!"
                                          (click.zoneless)="
                                            onToggleProject(item);
                                            $event.stopPropagation()
                                          "
                                        >
                                          {{ 'project' | translate }}
                                        </button>
                                      }
                                    </div>
                                  }
                                  @case ('admin_actions') {
                                    <div
                                      tuiCell
                                      size="m"
                                      class="justify-center h-full"
                                    >
                                      @if (global.canEditCrag()) {
                                        <button
                                          tuiIconButton
                                          size="s"
                                          appearance="negative"
                                          iconStart="@tui.unlink"
                                          class="rounded-full!"
                                          (click.zoneless)="
                                            deleteTopoRoute(item._ref);
                                            $event.stopPropagation()
                                          "
                                        >
                                          {{ 'unlink' | translate }}
                                        </button>
                                      }
                                    </div>
                                  }
                                }
                              </td>
                            }
                          </tr>
                        </tbody>
                      }
                    </table>
                  } @else {
                    <app-empty-state icon="@tui.route" />
                  }
                } @else {
                  <div class="flex h-full items-center justify-center p-4">
                    <app-paywall
                      [areaId]="t.crag?.area?.id || 0"
                      [price]="t.crag?.area?.price || 0"
                      [hideTitle]="true"
                    />
                  </div>
                }
              </tui-scrollbar>
            </div>
          </div>
        } @else {
          <div class="flex items-center justify-center h-full">
            <tui-loader size="xxl" />
          </div>
        }
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex grow h-full overflow-hidden',
    style: 'touch-action: auto',
  },
})
export class TopoComponent {
  protected readonly global = inject(GlobalData);
  private readonly supabase = inject(SupabaseService);
  protected readonly ascentsService = inject(AscentsService);
  private readonly toposService = inject(ToposService);
  protected readonly routesService = inject(RoutesService);
  protected readonly router = inject(Router);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly toast = inject(ToastService);
  protected readonly scrollContainer =
    viewChild<ElementRef<HTMLDivElement>>('scrollContainer');
  protected readonly fullscreenContainer = viewChild<
    ElementRef<HTMLDivElement>
  >('fullscreenContainer');
  protected readonly topoImgFullscreen =
    viewChild<ElementRef<HTMLImageElement>>('topoImgFullscreen');
  protected readonly topoImgNormal =
    viewChild<ElementRef<HTMLImageElement>>('topoImgNormal');
  protected readonly routeRows = viewChildren('routeRow', {
    read: ElementRef,
  });
  protected readonly indexInputs = viewChildren('indexInput', {
    read: ElementRef,
  });
  protected readonly heightInputs = viewChildren('heightInput', {
    read: ElementRef,
  });
  protected readonly zoomContainerNormal = viewChild<
    ElementRef<HTMLDivElement>
  >('zoomContainerNormal');
  protected readonly fullscreenZoomContainer = viewChild<
    ElementRef<HTMLDivElement>
  >('fullscreenZoomContainer');
  protected readonly isFullscreen = signal(false);
  protected readonly hoveredRouteId = signal<number | null>(null);
  protected readonly selectedRouteId = signal<number | null>(null);

  protected readonly zoomScale = linkedSignal({
    source: () => ({
      fs: this.isFullscreen(),
      id: this.topo()?.id,
    }),
    computation: () => 1,
  });

  protected readonly zoomPosition = linkedSignal({
    source: () => ({
      fs: this.isFullscreen(),
      id: this.topo()?.id,
    }),
    computation: () => ({ x: 0, y: 0 }),
  });

  // Viewer zoom/pan state adapter
  private readonly viewerState: ViewerZoomPanState = {
    zoomScale: this.zoomScale,
    zoomPosition: this.zoomPosition,
  };
  protected readonly dragState: ViewerDragState = createViewerDragState();

  protected readonly selectedRouteInfo = computed(() => {
    const routeId = this.selectedRouteId();
    const topo = this.topo();
    if (!routeId || !topo || !topo.topo_routes) return null;
    return topo.topo_routes.find((r) => r?.route_id === routeId) || null;
  });

  protected readonly imageRatio = signal(1);

  protected onImageLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img.naturalWidth && img.naturalHeight) {
      this.imageRatio.set(img.naturalWidth / img.naturalHeight);
    }

    // If a route was already selected before the image finished loading, center it now
    const selectedId = this.selectedRouteId();
    if (selectedId) {
      this.centerOnRoute();
    }
  }

  protected getPointsString(
    pathData: { points: { x: number; y: number }[] },
    scaleX = 1,
    scaleY = 1,
  ): string {
    return getPointsStringUtil(pathData.points, scaleX, scaleY);
  }

  protected onPathClick(event: Event, route: TopoRouteWithRoute): void {
    event.stopPropagation();
    this.selectedRouteId.set(
      this.selectedRouteId() === route.route_id ? null : route.route_id,
    );
  }

  protected onImageClick(): void {
    if (this.dragState.hasMoved) return;
    if (this.selectedRouteId()) {
      this.selectedRouteId.set(null);
    } else if (!this.isFullscreen()) {
      this.toggleFullscreen(!!this.topoImageResource.value());
    }
  }

  protected toggleFullscreen(value: boolean): void {
    this.isFullscreen.set(value);
  }

  protected readonly minScale = computed(() => {
    const ratio = this.imageRatio();
    const isFullscreen = this.isFullscreen();
    const container = isFullscreen
      ? this.fullscreenContainer()?.nativeElement
      : this.scrollContainer()?.nativeElement;

    if (!container) return 0.1;

    const w = container.offsetWidth;
    const h = container.offsetHeight;
    if (!w || !h) return 0.1;

    const containerRatio = w / h;

    if (isFullscreen) {
      // In fullscreen, with w-full, scale 1 is already full width.
      // We only need to zoom out if the image is too tall for the screen.
      // imageHeight = w_screen / ratio. We want s * imageHeight = h_screen.
      // s = h_screen / imageHeight = h_screen / (w_screen / ratio) = (h_screen / w_screen) * ratio = ratio / containerRatio.
      return Math.min(1, ratio / containerRatio);
    }

    // In normal view, we want to at least see the whole image (fit).
    return Math.max(0.1, Math.min(1, containerRatio / ratio));
  });

  protected resetZoom(): void {
    this.zoomScale.set(1);
    this.zoomPosition.set({ x: 0, y: 0 });
    this.dragState.initialTx = 0;
    this.dragState.initialTy = 0;
  }

  protected onWheel(event: Event): void {
    const el = this.getViewerElements();
    if (!el) return;
    handleViewerWheelZoom(event, this.viewerState, el, {
      minScale: this.minScale(),
    });
  }

  protected onTouchStart(event: Event): void {
    const el = this.getViewerElements();
    if (!el) return;
    handleViewerTouchStart(event, this.viewerState, this.dragState, el);
  }

  protected onTouchMove(event: Event): void {
    const el = this.getViewerElements();
    if (!el) return;
    handleViewerTouchMove(event, this.viewerState, this.dragState, el, {
      minScale: this.minScale(),
    });
  }

  protected onTouchEnd(): void {
    this.dragState.isDragging = false;
  }

  protected onMouseDown(event: MouseEvent): void {
    handleViewerMouseDown(event, this.viewerState, this.dragState);
  }

  protected onMouseMove(event: MouseEvent): void {
    const el = this.getViewerElements();
    if (!el) return;
    handleViewerMouseMove(event, this.viewerState, this.dragState, el);
  }

  protected onMouseUp(): void {
    this.dragState.isDragging = false;
  }

  // Route params
  countrySlug: InputSignal<string> = input.required();
  areaSlug: InputSignal<string> = input.required();
  cragSlug: InputSignal<string> = input.required();
  id: InputSignal<string | undefined> = input();
  sectorSlug: InputSignal<string | undefined> = input();

  protected readonly topo = this.global.topoDetailResource.value;

  protected readonly renderedTopoRoutes = computed(() => {
    const t = this.topo();
    if (!t) return [];

    const selectedId = this.selectedRouteId();
    const hoveredId = this.hoveredRouteId();
    const ratio = this.imageRatio();
    const hScale = 1000 / ratio;

    // Sort routes so the selected and hovered ones are rendered last (on top)
    const routes = [...t.topo_routes];

    routes.sort((a, b) => {
      const getPriority = (id: number) => {
        if (id === selectedId) return 2;
        if (id === hoveredId) return 1;
        return 0;
      };

      return getPriority(a.route_id) - getPriority(b.route_id);
    });

    return routes.map((tr) => {
      const isSelected = tr.route_id === selectedId;
      const isHovered = tr.route_id === hoveredId;
      const style = getRouteStyleProperties(
        isSelected,
        isHovered,
        tr.route.grade,
      );
      const width = getRouteStrokeWidth(
        isSelected,
        isHovered,
        5,
        'viewer',
        tr.path?.width,
      );

      const pointsString = tr.path
        ? getPointsStringUtil(tr.path.points, 1000, hScale)
        : '';

      return {
        ...tr,
        style,
        width,
        pointsString,
      };
    });
  });
  protected readonly crag = this.global.cragDetailResource.value;
  protected readonly allAreaTopos = this.global.areaToposResource.value;

  protected readonly sortedAreaTopos = computed(() => {
    const topos = this.allAreaTopos() || [];
    return [...topos].sort((a, b) => a.name.localeCompare(b.name));
  });

  protected readonly topoImageResource = resource({
    params: () => {
      const t = this.topo();
      if (!t?.photo) return null;
      return { path: t.photo, version: this.global.topoPhotoVersion() };
    },
    loader: async ({ params }) => {
      if (!params) return null;
      return await this.supabase.getTopoSignedUrl(params.path, params.version);
    },
  });

  protected readonly columns = computed(() => {
    const isMobile = this.global.isMobile();
    const base = isMobile
      ? ['index', 'grade', 'name']
      : ['index', 'grade', 'name', 'height', 'actions'];
    const crag = this.crag();
    if (!isMobile && this.global.areaAdminPermissions()[crag?.area_id ?? -1]) {
      base.push('admin_actions');
    }
    return base;
  });

  protected readonly tableData: Signal<TopoRouteRow[]> = computed(() => {
    const topo = this.topo();
    if (!topo) return [];
    return topo.topo_routes.map((tr) => {
      const r = tr.route;
      const climbed = !!r.own_ascent && r.own_ascent.type !== 'attempt';
      const project = !!r.project;

      return {
        index: tr.number,
        name: tr.route.name,
        grade: tr.route.grade,
        height: tr.route.height || null,
        slug: tr.route.slug,
        link: ['/area', this.areaSlug(), this.cragSlug(), tr.route.slug],
        climbed,
        project,
        _ref: tr,
      };
    });
  });

  protected readonly sortedTableData: Signal<TopoRouteRow[]> = computed(() => {
    const data = this.tableData();
    const sorter = this.sorter();
    const direction = this.direction();

    if (!sorter) {
      return data;
    }

    return [...data].sort((a, b) => {
      const result = sorter(a, b);
      return direction === TuiSortDirection.Desc ? -result : result;
    });
  });

  protected readonly direction = signal<TuiSortDirection>(TuiSortDirection.Asc);
  protected readonly sorter = signal<TuiComparator<TopoRouteRow>>(() => 0);

  protected onSortChange(sort: TuiTableSortChange<TopoRouteRow>): void {
    this.direction.set(sort.sortDirection);
    this.sorter.set(sort.sortComparator || (() => 0));
  }

  constructor() {
    effect(() => {
      this.global.resetDataByPage('topo');
      const aSlug = this.areaSlug();
      const cSlug = this.cragSlug();
      const topoId = this.id();
      this.global.selectedAreaSlug.set(aSlug);
      this.global.selectedCragSlug.set(cSlug);
      if (topoId) {
        this.global.selectedTopoId.set(topoId);
      }
    });

    effect(() => {
      const topoId = this.topo()?.id;
      const routeId = this.selectedRouteId();
      const isFullscreen = this.isFullscreen(); // Re-trigger when toggling fullscreen

      if (routeId && topoId) {
        this.centerOnRoute();

        // Only scroll the list if we are NOT in fullscreen (the list is hidden in FS)
        if (!isFullscreen) {
          const rows = this.routeRows(); // Reactive dependency on rows collection
          const rowId = `route-row-${topoId}-${routeId}`;
          const row = rows.find((r) => r?.nativeElement?.id === rowId);

          if (row?.nativeElement) {
            row.nativeElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest',
            });
          }
        }
      }
    });
  }

  private centerOnRoute(): void {
    const topo = this.topo();
    const els = this.getViewerElements();
    if (!topo || !isPlatformBrowser(this.platformId) || !els) return;

    const { img: imgEl } = els;

    // Helper to perform the actual centering
    // If the image is not ready, it will be centered by onImageLoad
    if (imgEl.naturalWidth === 0 || imgEl.offsetWidth === 0) {
      return;
    }

    const performCenter = (elements: ViewerElements) => {
      const info = this.selectedRouteInfo();
      if (!info || !info.path || info.path.points.length === 0) return;

      const pts = info.path.points;
      const minX = Math.min(...pts.map((p) => p.x));
      const maxX = Math.max(...pts.map((p) => p.x));
      const minY = Math.min(...pts.map((p) => p.y));
      const maxY = Math.max(...pts.map((p) => p.y));
      const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };

      centerViewerOnPoint(this.viewerState, center, elements);
    };

    performCenter(els);
  }

  private getViewerElements(): ViewerElements | null {
    const isFs = this.isFullscreen();
    const container = isFs
      ? this.fullscreenContainer()
      : this.scrollContainer();
    const zoomContainer = isFs
      ? this.fullscreenZoomContainer()
      : this.zoomContainerNormal();
    const img = isFs ? this.topoImgFullscreen() : this.topoImgNormal();

    if (!container || !zoomContainer || !img) return null;

    return {
      container: container.nativeElement,
      zoomContainer: zoomContainer.nativeElement,
      img: img.nativeElement,
    };
  }

  protected onLogAscent(tr: TopoRouteWithRoute): void {
    const route = tr.route;
    void firstValueFrom(
      this.ascentsService.openAscentForm({
        routeId: route.id,
        routeName: route.name,
        grade: route.grade,
        climbingKind: route.climbing_kind,
      }),
      { defaultValue: undefined },
    );
  }

  protected onEditAscent(
    ascent: RouteAscentWithExtras,
    routeName?: string,
  ): void {
    void firstValueFrom(
      this.ascentsService.openAscentForm({
        routeId: ascent.route_id,
        routeName,
        ascentData: ascent,
      }),
      { defaultValue: undefined },
    );
  }

  protected async onToggleProject(item: TopoRouteRow): Promise<void> {
    const routeToSync: Partial<RouteWithExtras> = {
      ...item._ref.route,
      project: !!item._ref.route.project,
    };
    await this.routesService.toggleRouteProject(
      item._ref.route_id,
      routeToSync,
    );
  }

  protected onUpdateRouteNumber(
    tr: TopoRouteWithRoute,
    newNumber: number | string | null,
  ): void {
    const val =
      typeof newNumber === 'string' ? parseInt(newNumber, 10) : newNumber;
    if (val === null || isNaN(val) || val === tr.number + 1) return;
    this.toposService
      .updateRouteOrder(tr.topo_id, tr.route_id, val - 1)
      .then(() => this.global.topoDetailResource.reload())
      .catch((err) => handleErrorToast(err, this.toast));
  }

  protected onUpdateRouteHeight(
    tr: TopoRouteWithRoute,
    newHeight: number | string | null,
  ): void {
    const val =
      newHeight === null || newHeight === ''
        ? null
        : typeof newHeight === 'string'
          ? parseInt(newHeight, 10)
          : newHeight;

    if (val === tr.route?.height) return;

    this.routesService
      .update(tr.route_id, { height: val })
      .then(() => this.global.topoDetailResource.reload())
      .catch((err) => handleErrorToast(err, this.toast));
  }

  openEditTopo(topo: TopoDetail): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const initialRouteIds = topo.topo_routes.map((tr) => tr.route_id);
    this.toposService.openTopoForm({
      cragId: topo.crag_id,
      topoData: topo,
      initialRouteIds,
    });
  }

  deleteTopo(topo: TopoDetail): void {
    if (!isPlatformBrowser(this.platformId)) return;

    void firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('topos.deleteTitle'),
        size: 's',
        data: {
          content: this.translate.instant('topos.deleteConfirm', {
            name: topo.name,
          }),
          yes: this.translate.instant('delete'),
          no: this.translate.instant('cancel'),
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    ).then((confirmed) => {
      if (!confirmed) return;
      this.toposService
        .delete(topo.id)
        .then(() =>
          this.router.navigate(['/area', this.areaSlug(), this.cragSlug()]),
        )
        .catch((err) => handleErrorToast(err, this.toast));
    });
  }

  deleteTopoRoute(topoRoute: TopoRouteWithRoute): void {
    if (!isPlatformBrowser(this.platformId)) return;

    void firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('topos.removeRouteTitle'),
        size: 's',
        data: {
          content: this.translate.instant('topos.removeRouteConfirm', {
            name: topoRoute.route.name,
          }),
          yes: this.translate.instant('delete'),
          no: this.translate.instant('cancel'),
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    ).then((confirmed) => {
      if (!confirmed) return;
      this.toposService
        .removeRoute(topoRoute.topo_id, topoRoute.route_id)
        .then(() => this.global.topoDetailResource.reload())
        .catch((err) => handleErrorToast(err, this.toast));
    });
  }

  protected navigateToTopo(topo: { id: number; crag_slug?: string }): void {
    void this.router.navigate([
      '/area',
      this.areaSlug(),
      topo.crag_slug || this.cragSlug(),
      'topo',
      topo.id,
    ]);
  }

  protected selectNextRoute(): void {
    this.navigateDrawnRoute(1);
  }

  protected selectPrevRoute(): void {
    this.navigateDrawnRoute(-1);
  }

  private navigateDrawnRoute(step: number): void {
    const topo = this.topo();
    const currentId = this.selectedRouteId();
    if (!topo || !currentId) return;

    // Filter only routes that have paths drawn
    const drawnRoutes = topo.topo_routes
      .filter((tr) => tr.path && tr.path.points.length > 0)
      .sort((a, b) => a.number - b.number);

    if (drawnRoutes.length === 0) return;

    const currentIndex = drawnRoutes.findIndex(
      (r) => r?.route_id === currentId,
    );
    if (currentIndex === -1) return;

    const nextIndex =
      (currentIndex + step + drawnRoutes.length) % drawnRoutes.length;
    this.selectedRouteId.set(drawnRoutes[nextIndex].route_id);
  }

  protected onTableKeyDown(event: KeyboardEvent, index?: number): void {
    const target = event.target as HTMLElement;
    const isInput = target.tagName === 'INPUT';

    if (
      (target.tagName === 'TEXTAREA' || target.isContentEditable) &&
      !isInput
    ) {
      return;
    }

    if (['ArrowUp', 'ArrowDown'].includes(event.key)) {
      const data = this.sortedTableData();
      if (data.length === 0) return;

      const step = event.key === 'ArrowUp' ? -1 : 1;
      let nextItem: TopoRouteRow | undefined;
      let nextIdx: number | undefined;

      if (isInput) {
        if (index !== undefined) {
          nextIdx = (index + step + data.length) % data.length;
        } else {
          // Fallback if index not passed
          const tr = target.closest('tr');
          const rowIdAttr = tr?.getAttribute('id') || '';
          const match = rowIdAttr.match(/route-row-(\d+)-(\d+)/);

          if (match) {
            const routeId = parseInt(match[2], 10);
            const currentIndex = data.findIndex(
              (item) => item?._ref?.route_id === routeId,
            );
            if (currentIndex !== -1) {
              nextIdx = (currentIndex + step + data.length) % data.length;
            }
          }
        }

        if (nextIdx !== undefined) {
          nextItem = data[nextIdx];

          if (nextItem?._ref) {
            event.preventDefault(); // Stop TuiInputNumber from changing value
            this.selectedRouteId.set(nextItem._ref.route_id);

            const inputClass = target.classList.contains('route-index-input')
              ? '.route-index-input'
              : '.route-height-input';

            const inputs =
              inputClass === '.route-index-input'
                ? this.indexInputs()
                : this.heightInputs();
            const nextInput = inputs[nextIdx!];
            if (nextInput?.nativeElement) {
              nextInput.nativeElement.focus();
              nextInput.nativeElement.select();
            }
          }
        }
        return;
      }

      // Existing logic for row selection navigation
      const currentId = this.selectedRouteId();
      let nextIndex = 0;

      if (currentId) {
        const currentIndex = data.findIndex(
          (item) => item?._ref?.route_id === currentId,
        );
        if (currentIndex !== -1) {
          nextIndex = (currentIndex + step + data.length) % data.length;
        }
      }

      nextItem = data[nextIndex];
      if (nextItem?._ref) {
        this.selectedRouteId.set(nextItem._ref.route_id);
        event.preventDefault(); // Prevent page scroll
      }
    }
  }
}
