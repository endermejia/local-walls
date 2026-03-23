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

import { RoutesService } from '../services/routes.service';
import { RouteDto } from '../models';

import { GradeComponent } from '../components/avatar-grade';

export interface PyramidSlotDialogData {
  level: number;
  expectedGrade?: number;
  currentRouteId?: number | null;
  userId: string;
  year: number;
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
}
