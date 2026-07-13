import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  resource,
  computed,
  signal,
  effect,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { GlobalData } from '../../services/global-data';

import {
  TuiAppearance,
  TuiLoader,
  TuiButton,
  TuiDialogService,
  TuiCheckbox,
} from '@taiga-ui/core';
import { TUI_CONFIRM, TuiConfirmData } from '@taiga-ui/kit';

import { IndoorService } from '../../services/indoor.service';
import { SupabaseService } from '../../services/supabase.service';
import { EmptyStateComponent } from '../ui/empty-state';
import { TopoCardComponent } from '../topo/topo-card';
import type { IndoorTopoListItem } from '../../models/indoor.model';

@Component({
  selector: 'app-indoor-topos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    TuiAppearance,
    TuiLoader,
    TuiButton,
    TuiCheckbox,
    EmptyStateComponent,
    TopoCardComponent,
  ],
  template: `
    <div class="flex flex-col gap-6">
      <div class="flex justify-between items-center px-3">
        <div>
          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input
              tuiCheckbox
              type="checkbox"
              [ngModel]="showLegacyTopos()"
              (ngModelChange)="showLegacyTopos.set($event)"
            />
            <span class="text-xs opacity-75">
              {{ 'indoor.showLegacyTopos' | translate }}
            </span>
          </label>
        </div>
        @if (canEdit()) {
          <button
            tuiButton
            appearance="textfield"
            size="s"
            iconStart="@tui.plus"
            (click.zoneless)="createTopo()"
          >
            {{ 'new' | translate }}
          </button>
        }
      </div>

      @if (toposResource.value(); as topos) {
        @if (topos.length > 0) {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (topo of topos; track topo.id) {
              <app-topo-card
                [topo]="topo"
                [isIndoor]="true"
                [pendingRoutes]="topo.total_routes - topo.own_ascents_count"
                [totalRoutes]="topo.total_routes"
                (selected)="onCardClick(topo)"
              />
            }
          </div>
        } @else {
          <app-empty-state />
        }
      } @else if (toposResource.isLoading()) {
        <tui-loader />
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndoorToposComponent {
  centerId = input.required<string>();
  centerSlug = input.required<string>();

  protected readonly indoor = inject(IndoorService);
  protected readonly supabase = inject(SupabaseService);
  protected readonly global = inject(GlobalData);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly dialogs = inject(TuiDialogService);

  protected readonly canEdit = computed(() => {
    return this.global.indoorAdminPermissions()[this.centerId()];
  });

  protected readonly showLegacyTopos = signal<boolean>(
    (() => {
      try {
        return (
          typeof window !== 'undefined' &&
          localStorage.getItem('show_legacy_topos') === 'true'
        );
      } catch {
        return false;
      }
    })(),
  );

  constructor() {
    effect(() => {
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            'show_legacy_topos',
            String(this.showLegacyTopos()),
          );
        }
      } catch {
        // localStorage can be unavailable (SSR or privacy-restricted browsers).
      }
    });
  }

  protected readonly toposResource = resource({
    params: () => ({
      id: this.centerId(),
      showLegacyTopos: this.showLegacyTopos(),
    }),
    loader: ({ params }): Promise<IndoorTopoListItem[]> =>
      this.indoor.getCenterTopos(params.id, params.showLegacyTopos),
  });

  onCardClick(topo: IndoorTopoListItem): void {
    void this.router.navigate(['/indoor', this.centerSlug(), 'topo', topo.id]);
  }

  async createTopo(): Promise<void> {
    const success = await this.indoor.openIndoorTopoForm(this.centerId());
    if (success) {
      this.toposResource.reload();
    }
  }

  async editTopo(topo: IndoorTopoListItem, event: Event): Promise<void> {
    event.stopPropagation();
    const success = await this.indoor.openIndoorTopoForm(this.centerId(), topo);
    if (success) {
      this.toposResource.reload();
    }
  }

  async deleteTopo(topo: IndoorTopoListItem, event: Event): Promise<void> {
    event.stopPropagation();
    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('topos.deleteTitle'),
        size: 's',
        data: {
          content: this.translate.instant('topos.deleteConfirm', {
            name: topo.name,
          }),
          yes: this.translate.instant('delete'),
          no: this.translate.instant('cancel'),
          appearance: 'negative',
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    );

    if (confirmed) {
      await this.indoor.deleteTopo(topo.id);
      this.toposResource.reload();
    }
  }
}
