import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  TuiButton,
  TuiDataList,
  TuiHint,
  TuiIcon,
  TuiLoader,
  TuiScrollbar,
  TuiTextfield,
} from '@taiga-ui/core';
import { TuiDialogContext } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

import { TranslatePipe } from '@ngx-translate/core';

import { RoutesService } from '../../services/routes.service';
import { AscentType, RouteDto } from '../../models';

import { GradeComponent } from '../ui/avatar-grade';
import { AscentTypeComponent } from '../ascent/ascent-type';

import { Router } from '@angular/router';

export interface PyramidSlotDialogData {
  level: number;
  expectedGrade?: number;
  currentRouteId?: number | null;
  currentRoute?:
    | (RouteDto & { crag?: { slug: string; area?: { slug: string } } })
    | null;
  isCompleted?: boolean;
  ascent?: { score: number; type: AscentType };
  userId: string;
  year: number;
  canDelete?: boolean;
}

@Component({
  selector: 'app-pyramid-slot-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    TuiButton,
    TuiDataList,
    TuiHint,
    TuiIcon,
    TuiLoader,
    TuiScrollbar,
    TuiTextfield,
    GradeComponent,
    AscentTypeComponent,
  ],
  template: `
    <div class="flex flex-col gap-4 p-4 min-w-[320px] max-w-[400px]">
      <div class="flex flex-col gap-1">
        <span class="text-sm opacity-60 uppercase font-bold tracking-wider">
          {{ 'pyramid.level' | translate }} {{ data.level }}
        </span>
        @if (data.expectedGrade) {
          <div class="flex items-center gap-2">
            <span class="text-xs"
              >{{ 'pyramid.requiredGrade' | translate }}:</span
            >
            <app-grade [grade]="data.expectedGrade" />
          </div>
        }
      </div>

      @if (data.currentRouteId && data.currentRoute) {
        <div
          class="flex flex-col items-center gap-2 p-4 rounded-2xl border cursor-pointer transition-transform hover:scale-105"
          [class.bg-[var(--tui-status-positive-pale)]]="data.isCompleted"
          [class.border-[var(--tui-status-positive)]]="data.isCompleted"
          [class.bg-[var(--tui-background-neutral-1)]]="!data.isCompleted"
          [class.border-transparent]="!data.isCompleted"
          tabindex="0"
          (click)="goToRoute(data.currentRoute)"
          (keydown.enter)="goToRoute(data.currentRoute)"
        >
          <div class="flex items-center gap-3 w-full justify-center">
            <app-grade [grade]="data.currentRoute.grade" />
            <span
              class="font-bold text-lg truncate max-w-[200px] hover:underline"
              >{{ data.currentRoute.name }}</span
            >
          </div>

          @if (data.isCompleted && data.ascent) {
            <div class="flex items-center gap-2 mt-2">
              <app-ascent-type [type]="data.ascent.type" />
              <span class="font-bold text-[var(--tui-status-positive)] text-sm">
                +{{ data.ascent.score }} {{ 'points' | translate }}
              </span>
            </div>
          }
        </div>
      } @else {
        <!-- Search Field -->
        <tui-textfield tuiTextfieldSize="m" [tuiTextfieldCleaner]="true">
          <tui-icon tuiIconStart icon="@tui.search" />
          <input
            tuiTextfield
            [ngModel]="searchQuery()"
            (ngModelChange)="onSearchChange($event)"
            [placeholder]="'search' | translate"
            autocomplete="off"
          />
        </tui-textfield>

        <!-- Results List -->
        <tui-loader [overlay]="true" [showLoader]="loading()">
          <tui-scrollbar class="max-h-[300px] -mx-2 px-2">
            <div class="flex flex-col gap-2 mt-2">
              @for (route of results(); track route.id) {
                <div
                  class="flex items-center justify-between p-3 rounded-2xl bg-[var(--tui-background-neutral-1)] hover:bg-[var(--tui-background-neutral-2)] cursor-pointer transition-colors border border-transparent hover:border-[var(--tui-border-normal)]"
                  tabindex="0"
                  (click)="selectRoute(route)"
                  (keydown.enter)="selectRoute(route)"
                >
                  <div class="flex items-center gap-3 min-w-0">
                    <app-grade [grade]="route.grade" size="s" />
                    <div class="flex flex-col min-w-0">
                      <span class="font-bold truncate">{{ route.name }}</span>
                      <span class="text-[10px] opacity-60 truncate">
                        {{ getExtra(route)['crag_name'] }} /
                        {{ getExtra(route)['area_name'] }}
                      </span>
                    </div>
                  </div>
                  <tui-icon icon="@tui.chevron-right" class="opacity-40" />
                </div>
              } @empty {
                @if (searchQuery().length >= 2) {
                  <div class="p-8 text-center opacity-40 italic">
                    {{ 'noResults' | translate }}
                  </div>
                } @else {
                  <div class="p-8 text-center opacity-40 italic">
                    {{ 'pyramid.startTyping' | translate }}
                  </div>
                }
              }
            </div>
          </tui-scrollbar>
        </tui-loader>
      }

      <!-- Actions -->
      @if (data.currentRouteId) {
        <div
          class="flex justify-center mt-2 border-t border-[var(--tui-border-normal)] pt-4"
        >
          <button
            tuiButton
            appearance="secondary-destructive"
            size="m"
            class="w-full"
            [disabled]="data.canDelete === false"
            (click)="selectRoute(null!)"
          >
            {{ 'pyramid.remove' | translate }}
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PyramidSlotDialogComponent {
  private routesService = inject(RoutesService);
  private router = inject(Router);
  context =
    inject<TuiDialogContext<RouteDto | null, PyramidSlotDialogData>>(
      POLYMORPHEUS_CONTEXT,
    );

  data = this.context.data;
  searchQuery = signal('');
  results = signal<RouteDto[]>([]);
  loading = signal(false);

  private searchTimeout: ReturnType<typeof setTimeout> | undefined;

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    if (query.length < 2) {
      this.results.set([]);
      return;
    }

    if (this.searchTimeout) clearTimeout(this.searchTimeout);

    this.searchTimeout = setTimeout(async () => {
      this.loading.set(true);
      try {
        const routes = await this.routesService.searchRoutes(query);
        // Filter by grade if required
        let filtered = routes;
        if (this.data.expectedGrade) {
          filtered = routes.filter((r) => r.grade === this.data.expectedGrade);
        }
        this.results.set(filtered as RouteDto[]);
      } catch (e) {
        console.error('Error searching routes:', e);
      } finally {
        this.loading.set(false);
      }
    }, 400);
  }

  getExtra(route: RouteDto): Record<string, unknown> {
    return route as unknown as Record<string, unknown>;
  }

  selectRoute(route: RouteDto): void {
    this.context.completeWith(route);
  }

  removeRoute(): void {
    this.context.completeWith(null);
  }

  goToRoute(
    route: RouteDto & { crag?: { slug: string; area?: { slug: string } } },
  ): void {
    const areaSlug = route.crag?.area?.slug;
    const cragSlug = route.crag?.slug;
    const routeSlug = route.slug;

    if (areaSlug && cragSlug && routeSlug) {
      this.context.completeWith(undefined as unknown as null); // Dismiss without action
      void this.router.navigate(['/area', areaSlug, cragSlug, routeSlug]);
    }
  }
}
