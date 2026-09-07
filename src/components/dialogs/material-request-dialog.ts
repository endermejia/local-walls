import { CommonModule, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  TuiAppearance,
  TuiButton,
  TuiDialogContext,
  TuiIcon,
  TuiLabel,
  TuiScrollbar,
  TuiTextfield,
} from '@taiga-ui/core';
import { TuiInputNumber, TuiSkeleton } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslatePipe } from '@ngx-translate/core';

import { AreaMaterialRequestsService } from '../../services/area-material-requests.service';
import { MaterialCatalogService } from '../../services/material-catalog.service';

import type { MaterialCatalogItem } from '../../models';

export interface MaterialRequestDialogData {
  areaId: number;
  areaName: string;
  availableBalance: number;
}

@Component({
  selector: 'app-material-request-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    FormsModule,
    TranslatePipe,
    TuiAppearance,
    TuiButton,
    TuiIcon,
    TuiInputNumber,
    TuiLabel,
    TuiScrollbar,
    TuiSkeleton,
    TuiTextfield,
  ],
  template: `
    <div class="flex flex-col gap-6 p-1 max-h-[80vh]">
      <!-- Header -->
      <div class="flex items-start justify-between gap-4 border-b pb-4">
        <div class="flex items-center gap-3">
          <div
            class="w-12 h-12 rounded-2xl bg-(--tui-background-accent-1) text-(--tui-background-base) flex items-center justify-center shrink-0 shadow-lg shadow-(--tui-background-accent-1)/20"
          >
            <tui-icon icon="@tui.package" class="w-6 h-6" />
          </div>
          <div class="flex flex-col">
            <h3 class="text-xl font-black tracking-tight m-0">
              {{ 'materialRequest.title' | translate }}
            </h3>
            <p class="text-xs text-(--tui-text-secondary) m-0">
              {{ context.data.areaName }}
            </p>
          </div>
        </div>

        <!-- Available Balance Badge -->
        <div
          class="flex flex-col items-end px-3.5 py-2 rounded-2xl bg-(--tui-background-accent-1)/10 border border-(--tui-background-accent-1)/20"
        >
          <span
            class="text-[10px] font-black uppercase tracking-wider text-(--tui-text-secondary)"
          >
            {{ 'materialRequest.availablePot' | translate }}
          </span>
          <span
            class="text-base font-black text-(--tui-text-accent) tabular-nums"
          >
            {{ context.data.availableBalance | number: '1.2-2' }}€
          </span>
        </div>
      </div>

      <!-- Catalog List -->
      <div class="flex flex-col gap-3">
        <span
          class="text-xs font-black uppercase tracking-wider text-(--tui-text-secondary)"
        >
          {{ 'materialRequest.selectMaterials' | translate }}
        </span>

        <tui-scrollbar class="max-h-72 sm:max-h-80 pr-2">
          <div class="flex flex-col gap-2.5">
            @if (catalogResource.isLoading()) {
              @for (_ of [1, 2, 3]; track $index) {
                <div [tuiSkeleton]="true" class="h-16 rounded-2xl"></div>
              }
            } @else {
              @for (item of catalogItems(); track item.id) {
                <div
                  class="flex items-center justify-between gap-4 p-3 rounded-2xl border bg-(--tui-background-neutral-1) hover:bg-(--tui-background-neutral-1-hover) transition-all"
                  [class.border-(--tui-border-focus)]="
                    getItemQuantity(item.id) > 0
                  "
                  [class.border-(--tui-border-normal)]="
                    getItemQuantity(item.id) === 0
                  "
                >
                  <!-- Item image & info -->
                  <div class="flex items-center gap-3 min-w-0">
                    @if (item.image_url) {
                      <img
                        [src]="item.image_url"
                        [alt]="item.name"
                        class="w-10 h-10 rounded-xl object-cover shrink-0 border"
                      />
                    } @else {
                      <div
                        class="w-10 h-10 rounded-xl bg-(--tui-background-neutral-2) flex items-center justify-center shrink-0"
                      >
                        <tui-icon
                          icon="@tui.hammer"
                          class="w-5 h-5 text-(--tui-text-secondary)"
                        />
                      </div>
                    }
                    <div class="flex flex-col min-w-0">
                      <span class="font-bold text-xs sm:text-sm truncate">
                        {{ item.name }}
                      </span>
                      <div
                        class="flex items-center gap-2 text-[11px] text-(--tui-text-secondary)"
                      >
                        @if (item.description) {
                          <span class="truncate">{{ item.description }}</span>
                          <span>•</span>
                        }
                        <span
                          class="font-bold text-(--tui-text-primary) tabular-nums"
                        >
                          {{ item.price | number: '1.2-2' }}€/{{
                            item.unit || 'ud'
                          }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Quantity controls -->
                  <div class="flex items-center gap-1 shrink-0">
                    <button
                      tuiButton
                      appearance="secondary"
                      size="xs"
                      type="button"
                      [disabled]="getItemQuantity(item.id) <= 0"
                      (click)="decrementItem(item.id)"
                    >
                      <tui-icon icon="@tui.minus" class="w-3 h-3" />
                    </button>
                    <span
                      class="w-8 text-center text-xs font-black tabular-nums"
                    >
                      {{ getItemQuantity(item.id) }}
                    </span>
                    <button
                      tuiButton
                      appearance="secondary"
                      size="xs"
                      type="button"
                      (click)="incrementItem(item.id)"
                    >
                      <tui-icon icon="@tui.plus" class="w-3 h-3" />
                    </button>
                  </div>
                </div>
              } @empty {
                <div
                  class="text-center py-6 text-xs text-(--tui-text-secondary)"
                >
                  {{ 'materialRequest.noCatalogItems' | translate }}
                </div>
              }
            }
          </div>
        </tui-scrollbar>
      </div>

      <!-- Notes / Shipping info -->
      <div class="flex flex-col gap-2">
        <tui-textfield>
          <label tuiLabel for="material-request-notes-textarea">{{
            'materialRequest.notesLabel' | translate
          }}</label>
          <textarea
            id="material-request-notes-textarea"
            tuiTextfield
            rows="2"
            [(ngModel)]="notes"
            [placeholder]="'materialRequest.notesPlaceholder' | translate"
          ></textarea>
        </tui-textfield>
      </div>

      <!-- Cost & Validation Summary -->
      <div class="flex flex-col gap-3 pt-2 border-t">
        <div class="flex items-center justify-between text-sm">
          <span class="font-bold text-(--tui-text-secondary)">
            {{ 'materialRequest.totalCost' | translate }}
          </span>
          <span
            class="text-lg font-black tabular-nums"
            [class.text-(--tui-status-negative)]="isOverBudget()"
            [class.text-(--tui-text-primary)]="!isOverBudget()"
          >
            {{ totalCost() | number: '1.2-2' }}€
          </span>
        </div>

        @if (isOverBudget()) {
          <div
            class="flex items-center gap-2 p-3 rounded-xl bg-(--tui-background-negative-neutral) text-(--tui-status-negative) text-xs font-semibold"
          >
            <tui-icon icon="@tui.triangle-alert" class="w-4 h-4 shrink-0" />
            <span>{{ 'materialRequest.overBudgetError' | translate }}</span>
          </div>
        }

        <!-- Action buttons -->
        <div class="flex items-center justify-end gap-3 pt-2">
          <button
            tuiButton
            appearance="flat"
            type="button"
            (click)="context.completeWith(false)"
          >
            {{ 'cancel' | translate }}
          </button>

          <button
            tuiButton
            appearance="accent"
            type="button"
            [disabled]="!canSubmit()"
            (click)="submitRequest()"
          >
            {{ 'materialRequest.submit' | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaterialRequestDialogComponent {
  protected readonly context =
    injectContext<TuiDialogContext<boolean, MaterialRequestDialogData>>();
  protected readonly catalogService = inject(MaterialCatalogService);
  protected readonly requestsService = inject(AreaMaterialRequestsService);

  readonly catalogResource = resource<MaterialCatalogItem[], void>({
    loader: () => this.catalogService.loadCatalog(false),
  });

  readonly catalogItems = computed(() => this.catalogResource.value() ?? []);

  readonly quantities = signal<Record<number, number>>({});
  notes = signal<string>('');

  getItemQuantity(materialId: number): number {
    return this.quantities()[materialId] || 0;
  }

  incrementItem(materialId: number): void {
    this.quantities.update((q) => ({
      ...q,
      [materialId]: (q[materialId] || 0) + 1,
    }));
  }

  decrementItem(materialId: number): void {
    this.quantities.update((q) => {
      const current = q[materialId] || 0;
      if (current <= 1) {
        const next = { ...q };
        delete next[materialId];
        return next;
      }
      return { ...q, [materialId]: current - 1 };
    });
  }

  readonly totalCost = computed(() => {
    const qMap = this.quantities();
    const items = this.catalogItems();
    let total = 0;
    for (const item of items) {
      const qty = qMap[item.id] || 0;
      if (qty > 0) {
        total += item.price * qty;
      }
    }
    return Math.round(total * 100) / 100;
  });

  readonly isOverBudget = computed(() => {
    return this.totalCost() > this.context.data.availableBalance;
  });

  readonly canSubmit = computed(() => {
    return (
      this.totalCost() > 0 &&
      !this.isOverBudget() &&
      !this.requestsService.loading()
    );
  });

  async submitRequest(): Promise<void> {
    if (!this.canSubmit()) return;

    const qMap = this.quantities();
    const itemsPayload = Object.entries(qMap)
      .map(([matId, qty]) => ({
        material_id: Number(matId),
        quantity: qty,
      }))
      .filter((i) => i.quantity > 0);

    if (itemsPayload.length === 0) return;

    const result = await this.requestsService.createRequest(
      this.context.data.areaId,
      itemsPayload,
      this.notes().trim(),
    );

    if (result !== null) {
      this.context.completeWith(true);
    }
  }
}
