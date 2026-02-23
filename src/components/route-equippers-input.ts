import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  PLATFORM_ID,
  resource,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TranslatePipe } from '@ngx-translate/core';

import { TuiIdentityMatcher } from '@taiga-ui/cdk';
import { TuiDataList, TuiTextfield } from '@taiga-ui/core';
import {
  TuiChevron,
  TuiFilterByInputPipe,
  TuiHideSelectedPipe,
  TuiInputChip,
} from '@taiga-ui/kit';

import { EquipperDto, RouteWithExtras } from '../models';
import { RoutesService, SupabaseService, ToastService } from '../services';

@Component({
  selector: 'app-route-equippers-input',
  imports: [
    FormsModule,
    TuiTextfield,
    TuiChevron,
    TuiInputChip,
    TuiDataList,
    TuiFilterByInputPipe,
    TuiHideSelectedPipe,
    TranslatePipe,
  ],
  template: `
    <tui-textfield
      multi
      tuiChevron
      tuiTextfieldSize="s"
      class="!border-none !bg-transparent h-full"
      style="border-block-end: none;"
      [tuiTextfieldCleaner]="false"
      [stringify]="equipperStringify"
      [identityMatcher]="equipperIdentityMatcher"
    >
      <input
        tuiInputChip
        autocomplete="off"
        [ngModel]="equippers()"
        (ngModelChange)="onEquippersChange($event)"
        [placeholder]="'actions.select' | translate"
      />
      <tui-input-chip *tuiItem />
      <tui-data-list *tuiTextfieldDropdown>
        @for (
          item of allEquippers.value() || []
            | tuiHideSelected
            | tuiFilterByInput;
          track item.name
        ) {
          <button tuiOption new [value]="item">
            {{ item.name }}
          </button>
        }
      </tui-data-list>
    </tui-textfield>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-40 max-w-64 h-full' },
})
export class RouteEquippersInputComponent {
  private readonly routes = inject(RoutesService);
  private readonly supabase = inject(SupabaseService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly toast = inject(ToastService);

  route = input.required<RouteWithExtras>();
  equippers = signal<readonly (EquipperDto | string)[]>([]);

  protected readonly equipperStringify = (
    item: EquipperDto | string,
  ): string => (typeof item === 'string' ? item : item.name);

  protected readonly equipperIdentityMatcher: TuiIdentityMatcher<
    EquipperDto | string
  > = (a, b) => {
    if (a === b) return true;
    if (typeof a === 'string' || typeof b === 'string') return a === b;
    return a.id === b.id;
  };

  protected readonly allEquippers = resource<EquipperDto[], undefined>({
    loader: async () => {
      await this.supabase.whenReady();
      if (!isPlatformBrowser(this.platformId)) return [];
      const { data } = await this.supabase.client
        .from('equippers')
        .select('*')
        .order('name');
      return (data as EquipperDto[]) || [];
    },
  });

  constructor() {
    effect(async () => {
      const route = this.route();
      if (!route) return;
      const eqs = await this.routes.getRouteEquippers(route.id);
      this.equippers.set(eqs);
    });
  }

  async onEquippersChange(
    newEquippers: readonly (EquipperDto | string)[],
  ): Promise<void> {
    this.equippers.set(newEquippers);
    const r = this.route();
    if (!r) return;
    try {
      await this.routes.setRouteEquippers(r.id, newEquippers);
    } catch (e) {
      console.error('[RouteEquippersInput] error', e);
      this.toast.error('errors.unexpected');
    }
  }
}
