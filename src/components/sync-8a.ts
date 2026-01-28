import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  TuiButton,
  TuiDataList,
  TuiError,
  TuiHint,
  TuiLabel,
  TuiLoader,
  TuiTextfield,
} from '@taiga-ui/core';
import {
  TuiChevron,
  TuiComboBox,
  TuiFilterByInputPipe,
} from '@taiga-ui/kit';
import { type TuiDialogContext } from '@taiga-ui/experimental';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom, Subject } from 'rxjs';

import {
  CragDto,
  GradeLabel,
  LABEL_TO_VERTICAL_LIFE,
  RouteInsertDto,
  SearchCragItem,
  SearchRouteItem,
} from '../models';

import {
  EightAnuService,
  GlobalData,
  NotificationService,
  SupabaseService,
  ToastService,
} from '../services';

@Component({
  selector: 'app-sync-8a',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    TuiButton,
    TuiChevron,
    TuiComboBox,
    TuiDataList,
    TuiError,
    TuiFilterByInputPipe,
    TuiHint,
    TuiLabel,
    TuiLoader,
    TuiTextfield,
  ],
  template: `
    <div class="flex flex-col gap-4">
      <p class="text-sm opacity-70">
        {{ 'sync8a.title' | translate }}
      </p>

      <!-- Target Local Crag (if not provided) -->
      @if (!context.data?.cragId) {
        <tui-textfield tuiChevron class="block" [stringify]="stringifyCrag">
          <label tuiLabel for="target-crag">{{
            'crags.targetCrag' | translate
          }}</label>
          <input
            tuiComboBox
            id="target-crag"
            autocomplete="off"
            [formControl]="targetCrag"
            [placeholder]="'actions.select' | translate"
          />
          <tui-data-list *tuiTextfieldDropdown>
            @for (
              crag of global.cragsList() | tuiFilterByInput;
              track crag.id
            ) {
              <button tuiOption [value]="crag">
                {{ crag.name }}
              </button>
            }
          </tui-data-list>
          @if (targetCrag.invalid && targetCrag.touched) {
            <tui-error [error]="'errors.required' | translate" />
          }
        </tui-textfield>
      }

      <tui-textfield tuiChevron class="block">
        <label tuiLabel for="category">{{
          'labels.climbing_kind' | translate
        }}</label>
        <input
          tuiComboBox
          id="category"
          autocomplete="off"
          [formControl]="category"
          [placeholder]="'actions.select' | translate"
        />
        <tui-data-list *tuiTextfieldDropdown>
          @for (cat of categories; track cat) {
            <button tuiOption [value]="cat">
              {{ 'filters.types.' + cat | translate }}
            </button>
          }
        </tui-data-list>
      </tui-textfield>

      <tui-textfield tuiChevron class="block">
        <label tuiLabel for="country">{{ 'labels.country' | translate }}</label>
        <input
          tuiComboBox
          id="country"
          autocomplete="off"
          [formControl]="country"
          [placeholder]="'actions.select' | translate"
        />
        <tui-data-list *tuiTextfieldDropdown>
          @for (c of countries; track c) {
            <button tuiOption [value]="c">
              {{ c }}
            </button>
          }
        </tui-data-list>
      </tui-textfield>

      <tui-textfield tuiChevron class="block">
        <label tuiLabel for="area">{{ 'sync8a.searchArea' | translate }}</label>
        <input
          tuiComboBox
          id="area"
          #areaInput
          autocomplete="off"
          [formControl]="area"
          [placeholder]="'actions.select' | translate"
          (input)="onSearchArea(areaInput.value)"
        />
        <tui-data-list *tuiTextfieldDropdown>
          @for (item of areas(); track item.cragSlug) {
            <button tuiOption [value]="item">
              {{ item.cragName }} ({{ item.areaName }})
            </button>
          } @empty {
            @if (searchingArea()) {
              <tui-loader class="p-4" />
            } @else {
              <div class="p-4 text-sm opacity-50">
                {{ 'sync8a.noResults' | translate }}
              </div>
            }
          }
        </tui-data-list>
      </tui-textfield>

      <tui-textfield tuiChevron class="block">
        <label tuiLabel for="sector">{{
          'sync8a.searchSector' | translate
        }}</label>
        <input
          tuiComboBox
          id="sector"
          #sectorInput
          autocomplete="off"
          [formControl]="sector"
          [placeholder]="'actions.select' | translate"
          (input)="onSearchSector(sectorInput.value)"
        />
        <tui-data-list *tuiTextfieldDropdown>
          @for (item of sectors(); track item.sectorSlug) {
            <button tuiOption [value]="item">
              {{ item.sectorName }}
            </button>
          } @empty {
            @if (searchingSector()) {
              <tui-loader class="p-4" />
            } @else {
              <div class="p-4 text-sm opacity-50">
                {{ 'sync8a.noResults' | translate }}
              </div>
            }
          }
        </tui-data-list>
      </tui-textfield>

      <div class="flex justify-end gap-2 mt-4">
        <button
          tuiButton
          appearance="secondary"
          type="button"
          (click)="context.completeWith(false)"
        >
          {{ 'actions.cancel' | translate }}
        </button>
        <button
          tuiButton
          appearance="primary"
          [disabled]="!sector.value || syncing()"
          (click)="onSync()"
        >
          {{ 'actions.import' | translate }}
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
})
export class Sync8aComponent {
  protected readonly global = inject(GlobalData);
  protected readonly context = injectContext<
    TuiDialogContext<boolean, { areaId?: number; cragId?: number } | void>
  >();
  private readonly eightAnuService = inject(EightAnuService);
  private readonly supabase = inject(SupabaseService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly notification = inject(NotificationService);

  protected readonly countries = [
    'ES',
    'FR',
    'IT',
    'DE',
    'US',
    'GB',
    'AD',
    'BE',
    'CH',
    'AT',
    'GR',
    'PT',
  ];
  protected readonly categories = ['sport', 'boulder'];

  category = new FormControl<string>('sport', Validators.required);
  country = new FormControl<string>('ES', Validators.required);
  area = new FormControl<SearchCragItem | null>(null, Validators.required);
  sector = new FormControl<SearchRouteItem | null>(null, Validators.required);
  targetCrag = new FormControl<CragDto | null>(null, Validators.required);

  protected readonly stringifyCrag = (crag: CragDto) => crag.name;

  protected readonly areas = signal<SearchCragItem[]>([]);
  protected readonly sectors = signal<SearchRouteItem[]>([]);
  protected readonly searchingArea = signal(false);
  protected readonly searchingSector = signal(false);
  protected readonly syncing = signal(false);

  async onSearchArea(query: string) {
    if (query.length < 2) return;
    this.searchingArea.set(true);
    try {
      const results = await this.eightAnuService.searchCrags(
        this.country.value!,
        query,
      );
      this.areas.set(results);
    } finally {
      this.searchingArea.set(false);
    }
  }

  async onSearchSector(query: string) {
    if (!this.area.value || query.length < 2) return;
    this.searchingSector.set(true);
    try {
      const results = await this.eightAnuService.searchRoutes(
        this.country.value!,
        this.area.value.areaName,
        this.area.value.cragName,
        query,
      );
      // Group by sector slug to show unique sectors
      const uniqueSectors = results.reduce((acc, curr) => {
        if (!acc.some((s) => s.sectorSlug === curr.sectorSlug)) {
          acc.push(curr);
        }
        return acc;
      }, [] as SearchRouteItem[]);
      this.sectors.set(uniqueSectors);
    } finally {
      this.searchingSector.set(false);
    }
  }

  async onSync() {
    const area8a = this.area.value;
    const sector8a = this.sector.value;
    if (!area8a || !sector8a) return;

    this.syncing.set(true);
    let loaderClose$: Subject<void> | undefined;

    try {
      loaderClose$ = this.toast.showLoader('sync8a.syncing');
      const countrySlug = this.eightAnuService.getCountrySlug(
        this.country.value!,
      );
      const cat8a =
        this.category.value === 'boulder' ? 'bouldering' : 'sportclimbing';

      const response = await firstValueFrom(
        this.eightAnuService.getRoutes(
          cat8a,
          countrySlug,
          sector8a.cragSlug, // 8a.nu cragSlug is our Area
          sector8a.sectorSlug, // 8a.nu sectorSlug is our Crag
        ),
      );

      if (!response?.items) {
        throw new Error('No routes found');
      }

      const cragId = this.context.data?.cragId || this.targetCrag.value?.id;
      if (!cragId) {
        throw new Error('Crag ID not provided');
      }

      // 1. Get existing routes for this crag
      const { data: existingRoutes, error: fetchError } =
        await this.supabase.client
          .from('routes')
          .select('id, name, slug, eight_anu_route_slugs')
          .eq('crag_id', cragId);

      if (fetchError) throw fetchError;

      const routesToCreate: Omit<RouteInsertDto, 'id' | 'created_at'>[] = [];
      let updatedCount = 0;

      for (const r8a of response.items) {
        const difficulty = r8a.difficulty.toLowerCase() as GradeLabel;
        const grade = LABEL_TO_VERTICAL_LIFE[difficulty] ?? 0;

        const existing = existingRoutes?.find(
          (er) =>
            er.eight_anu_route_slugs?.includes(r8a.zlaggableSlug) ||
            er.slug === r8a.zlaggableSlug ||
            er.name.toLowerCase() === r8a.zlaggableName.toLowerCase(),
        );

        if (!existing) {
          routesToCreate.push({
            name: r8a.zlaggableName,
            slug: r8a.zlaggableSlug,
            crag_id: cragId,
            grade: grade > 0 ? grade : 3,
            eight_anu_route_slugs: [r8a.zlaggableSlug],
            climbing_kind:
              this.category.value === 'boulder' ? 'boulder' : 'sport',
          });
        } else {
          if (!existing.eight_anu_route_slugs?.includes(r8a.zlaggableSlug)) {
            const newSlugs = [
              ...(existing.eight_anu_route_slugs || []),
              r8a.zlaggableSlug,
            ];
            await this.supabase.client
              .from('routes')
              .update({ eight_anu_route_slugs: newSlugs })
              .eq('id', existing.id);
            updatedCount++;
          }
        }
      }

      if (routesToCreate.length > 0) {
        const { error: insertError } = await this.supabase.client
          .from('routes')
          .insert(routesToCreate);
        if (insertError) throw insertError;
      }

      // Update Crag with 8a slugs
      const { data: cragData } = await this.supabase.client
        .from('crags')
        .select('eight_anu_sector_slugs, area_id')
        .eq('id', cragId)
        .single();

      if (cragData) {
        const sectorSlugs = [...(cragData.eight_anu_sector_slugs || [])];
        if (!sectorSlugs.includes(sector8a.sectorSlug)) {
          sectorSlugs.push(sector8a.sectorSlug);
          await this.supabase.client
            .from('crags')
            .update({ eight_anu_sector_slugs: sectorSlugs })
            .eq('id', cragId);
        }

        if (cragData.area_id) {
          const { data: areaData } = await this.supabase.client
            .from('areas')
            .select('eight_anu_crag_slugs')
            .eq('id', cragData.area_id)
            .single();

          if (areaData) {
            const areaSlugs = [...(areaData.eight_anu_crag_slugs || [])];
            if (!areaSlugs.includes(sector8a.cragSlug)) {
              areaSlugs.push(sector8a.cragSlug);
              await this.supabase.client
                .from('areas')
                .update({ eight_anu_crag_slugs: areaSlugs })
                .eq('id', cragData.area_id);
            }
          }
        }
      }

      this.notification.success(
        this.translate.instant('sync8a.success') +
          ` (+${routesToCreate.length} routes, ${updatedCount} updated)`,
        'sync8a.title',
      );

      this.global.cragRoutesResource.reload();
      this.context.completeWith(true);
    } catch (e) {
      console.error(e);
      this.toast.error('sync8a.error');
    } finally {
      this.syncing.set(false);
      if (loaderClose$) {
        loaderClose$.next();
        loaderClose$.complete();
      }
    }
  }
}
