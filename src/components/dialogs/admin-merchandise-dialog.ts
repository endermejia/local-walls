import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';

import {
  CdkDrag,
  CdkDragDrop,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';

import { injectContext, PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiDialogContext } from '@taiga-ui/core';
import {
  TuiButton,
  TuiLabel,
  TuiDataList,
  TuiIcon,
  TuiDialogService,
  TuiLoader,
  TuiInput,
  TuiHint,
} from '@taiga-ui/core';
import {
  TuiInputChip,
  TuiInputNumber,
  TuiTextarea,
  TuiSwitch,
  TuiSelect,
  TuiDataListWrapper,
  TuiChevron,
  TuiFiles,
} from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import { MerchandiseService } from '../../services/merchandise.service';

import { ToastService } from '../../services/toast.service';

import { ImageEditorDialogComponent } from './image-editor-dialog';

import { MerchandiseItemDetail, MerchandiseStock } from '../../models';

const MERCHANDISE_CATEGORIES = [
  'camiseta',
  'sudadera',
  'gorra',
  'bolsa-magnesio',
  'taza',
  'parche',
  'pegatina',
  'complemento',
  'croquis',
] as const;

@Component({
  selector: 'app-admin-merchandise-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    CdkDrag,
    CdkDropList,
    TuiButton,
    TuiChevron,
    TuiDataList,
    TuiDataListWrapper,
    TuiFiles,
    TuiHint,
    TuiIcon,
    TuiInput,
    TuiInputChip,
    TuiInputNumber,
    TuiLabel,
    TuiLoader,
    TuiSelect,
    TuiSwitch,
    TuiTextarea,
  ],
  template: `
    <div class="flex flex-col gap-6">
      <div class="grid grid-cols-1 gap-4">
        <!-- Name -->
        <tui-textfield class="w-full">
          <label tuiLabel for="name">{{ 'userName' | translate }}</label>
          <input
            id="name"
            tuiInput
            type="text"
            [ngModel]="model().name"
            (ngModelChange)="updateModel('name', $event)"
            name="name"
          />
        </tui-textfield>

        <!-- Category + Price -->
        <div class="grid grid-cols-2 gap-4">
          <tui-textfield
            tuiChevron
            [stringify]="categoryStringify"
            class="w-full"
          >
            <label tuiLabel for="category-select">{{
              'merchandising.items.category' | translate
            }}</label>
            <input
              id="category-select"
              tuiSelect
              [placeholder]="'merchandising.packs.selectCategory' | translate"
              [ngModel]="model().category"
              (ngModelChange)="updateModel('category', $event)"
              name="category"
            />
            <tui-data-list-wrapper *tuiDropdown new [items]="categories" />
          </tui-textfield>

          <tui-textfield class="w-full">
            <label tuiLabel for="price">{{ 'price' | translate }}</label>
            <input
              id="price"
              tuiInputNumber
              [min]="0"
              [ngModel]="model().price"
              (ngModelChange)="updateModel('price', $event)"
              name="price"
            />
            <span class="tui-textfield__suffix">€</span>
          </tui-textfield>
        </div>

        <!-- Sizes -->
        <tui-textfield multi class="block">
          <label tuiLabel for="sizes">{{
            'merchandising.items.sizes' | translate
          }}</label>
          <input
            id="sizes"
            tuiInputChip
            [ngModel]="model().available_sizes"
            (ngModelChange)="onSizesChange($event)"
            name="available_sizes"
            autocomplete="off"
          />
          <tui-input-chip *tuiItem />
        </tui-textfield>

        <!-- Colors -->
        <tui-textfield multi class="block">
          <label tuiLabel for="colors">{{
            'merchandising.items.colors' | translate
          }}</label>
          <input
            id="colors"
            tuiInputChip
            [ngModel]="model().available_colors"
            (ngModelChange)="updateModel('available_colors', $event)"
            name="available_colors"
            autocomplete="off"
          />
          <tui-input-chip *tuiItem />
        </tui-textfield>

        <!-- Stock per Size -->
        <div
          class="flex flex-col gap-3 p-4 rounded-2xl bg-(--tui-background-neutral-1) border border-(--tui-border-normal)"
        >
          <span class="text-xs font-bold uppercase tracking-widest opacity-60">
            {{ 'merchandising.items.stock' | translate }}
          </span>

          @if (model().available_sizes.length === 0) {
            <div class="py-4 text-center text-xs opacity-50 italic">
              {{ 'merchandising.items.noSizesForStock' | translate }}
            </div>
          } @else {
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              @for (size of model().available_sizes; track size) {
                <tui-textfield class="w-full" size="s">
                  <label tuiLabel [for]="'stock-' + size">{{ size }}</label>
                  <input
                    [id]="'stock-' + size"
                    tuiInputNumber
                    [min]="0"
                    [ngModel]="getStockForSize(size)"
                    (ngModelChange)="updateStockForSize(size, $event)"
                  />
                </tui-textfield>
              }
            </div>
          }
        </div>

        <!-- Description -->
        <tui-textfield class="w-full">
          <label tuiLabel for="description">{{
            'description' | translate
          }}</label>
          <textarea
            id="description"
            tuiTextarea
            [rows]="3"
            [ngModel]="model().description"
            (ngModelChange)="updateModel('description', $event)"
            name="description"
          ></textarea>
        </tui-textfield>

        <!-- Images Gallery -->
        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between px-1">
            <span class="text-xs font-bold opacity-60 uppercase">{{
              'merchandising.items.gallery' | translate
            }}</span>
            <label tuiInputFiles>
              <input
                accept="image/*"
                tuiInputFiles
                multiple
                [ngModel]="fileInputModel()"
                (ngModelChange)="onPhotoFileChange($event)"
              />
              <button
                tuiButton
                type="button"
                appearance="flat"
                size="s"
                iconStart="@tui.plus"
              >
                {{ 'merchandising.items.addImage' | translate }}
              </button>
            </label>
          </div>

          <div
            class="grid grid-cols-2 sm:grid-cols-3 gap-3"
            cdkDropList
            cdkDropListOrientation="mixed"
            (cdkDropListDropped)="dropImage($event)"
          >
            @for (url of model().image_urls; track url) {
              <div
                cdkDrag
                class="relative aspect-square rounded-xl overflow-hidden border border-(--tui-border-normal) group cursor-grab active:cursor-grabbing"
              >
                <img [src]="url" class="w-full h-full object-cover" />
                <div
                  class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <div class="bg-(--tui-background-base) rounded-xl p-0.5">
                    <button
                      tuiButton
                      type="button"
                      appearance="destructive"
                      size="s"
                      (click)="removeExistingImage(url)"
                    >
                      <tui-icon icon="@tui.trash" />
                    </button>
                  </div>
                </div>
              </div>
            }

            @for (item of newPhotos(); track item.id) {
              <div
                cdkDrag
                class="relative aspect-square rounded-xl overflow-hidden border border-accent border-dashed group cursor-grab active:cursor-grabbing"
              >
                <img [src]="item.preview" class="w-full h-full object-cover" />
                <div
                  class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <div class="bg-(--tui-background-base) rounded-xl p-0.5">
                    <button
                      tuiButton
                      type="button"
                      appearance="destructive"
                      size="s"
                      (click)="removeNewPhoto(item.id)"
                    >
                      <tui-icon icon="@tui.trash" />
                    </button>
                  </div>
                </div>
                <div
                  class="absolute top-1 right-1 bg-(--tui-background-base) rounded-full p-0.5"
                  [tuiHint]="'merchandising.items.newPhoto' | translate"
                >
                  <tui-icon
                    icon="@tui.circle-check"
                    class="text-sm"
                    style="color: var(--tui-status-positive)"
                  />
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Active -->
        <div
          class="flex items-center justify-between gap-4 p-4 rounded-xl bg-(--tui-base-02)"
        >
          <span class="font-semibold">{{
            'merchandising.items.active' | translate
          }}</span>
          <input
            tuiSwitch
            type="checkbox"
            [ngModel]="model().active"
            (ngModelChange)="updateModel('active', $event)"
            name="active"
          />
        </div>
      </div>

      <div class="flex justify-end gap-3 px-1 mt-4">
        <button
          tuiButton
          appearance="flat"
          type="button"
          (click)="context.completeWith(null)"
        >
          {{ 'cancel' | translate }}
        </button>
        <tui-loader [loading]="isSaving() || isUploading()" [overlay]="true">
          <button tuiButton appearance="primary" type="button" (click)="save()">
            {{ 'save' | translate }}
          </button>
        </tui-loader>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminMerchandiseDialogComponent {
  readonly context =
    injectContext<
      TuiDialogContext<
        MerchandiseItemDetail | null,
        MerchandiseItemDetail | undefined
      >
    >();
  private readonly merchService = inject(MerchandiseService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly dialogs = inject(TuiDialogService);

  readonly isSaving = signal(false);
  readonly isUploading = signal(false);

  protected readonly newPhotos = signal<
    { id: string; file: File; preview: string }[]
  >([]);
  protected readonly isProcessingPhoto = signal(false);
  protected readonly fileInputModel = signal<File[] | null>(null);

  readonly categories = [...MERCHANDISE_CATEGORIES];

  protected readonly categoryStringify = (category: string): string => {
    if (!category) return '';
    const key = 'merchandising.filter.' + category;
    const translated = this.translate.instant(key);
    return translated === key ? category : translated;
  };

  protected readonly model = signal({
    id: this.context.data?.id,
    name: this.context.data?.name || '',
    category: this.context.data?.category || '',
    price: this.context.data?.price || 0,
    stock: this.context.data?.stock || ([] as MerchandiseStock[]),
    description: this.context.data?.description || '',
    image_urls: this.context.data?.image_urls || ([] as string[]),
    active: this.context.data?.active ?? true,
    available_sizes: this.context.data?.available_sizes || [],
    available_colors: this.context.data?.available_colors || [],
  });

  constructor() {}

  protected onSizesChange(sizes: string[]): void {
    this.updateModel('available_sizes', sizes);
    this.syncStockWithSizes(sizes);
  }

  updateModel<K extends keyof ReturnType<typeof this.model>>(
    key: K,
    value: ReturnType<typeof this.model>[K],
  ): void {
    this.model.update((m: ReturnType<typeof this.model>) => ({
      ...m,
      [key]: value,
    }));
  }

  protected getStockForSize(size: string): number {
    return this.model().stock.find((s) => s.size === size)?.stock || 0;
  }

  protected updateStockForSize(size: string, stock: number): void {
    const currentStock = [...this.model().stock];
    const index = currentStock.findIndex((s) => s.size === size);

    if (index >= 0) {
      currentStock[index] = { ...currentStock[index], stock };
    } else {
      currentStock.push({
        id: '', // Will be generated or ignored by upsert
        item_id: this.model().id || '',
        size,
        stock,
        created_at: null,
        updated_at: null,
      });
    }

    this.updateModel('stock', currentStock);
  }

  private syncStockWithSizes(sizes: string[]): void {
    const currentStock = [...this.model().stock];
    // Keep only stock entries for sizes that are still present
    const filteredStock = currentStock.filter((s) => sizes.includes(s.size));

    // Add missing entries
    for (const size of sizes) {
      if (!filteredStock.find((s) => s.size === size)) {
        filteredStock.push({
          id: '',
          item_id: this.model().id || '',
          size,
          stock: 0,
          created_at: null,
          updated_at: null,
        });
      }
    }

    this.updateModel('stock', filteredStock);
  }

  async onPhotoFileChange(files: File | File[] | null): Promise<void> {
    if (!files) return;

    const fileArray = Array.isArray(files) ? files : [files];

    // Reset the input model to avoid accumulating files and opening multiple dialogs next time
    this.fileInputModel.set(null);

    for (const file of fileArray) {
      this.isProcessingPhoto.set(true);
      await this.editPhoto(file);
    }
  }

  protected removeExistingImage(url: string): void {
    this.model.update((m) => ({
      ...m,
      image_urls: m.image_urls.filter((u) => u !== url),
    }));
  }

  protected removeNewPhoto(id: string): void {
    this.newPhotos.update((photos) => photos.filter((p) => p.id !== id));
  }

  protected dropImage(event: CdkDragDrop<unknown[]>): void {
    type ExistingItem = { type: 'existing'; url: string };
    type NewItem = {
      type: 'new';
      photo: { id: string; file: File; preview: string };
    };
    type Item = ExistingItem | NewItem;

    const combined: Item[] = [
      ...this.model().image_urls.map(
        (url): ExistingItem => ({ type: 'existing', url }),
      ),
      ...this.newPhotos().map((p): NewItem => ({ type: 'new', photo: p })),
    ];

    moveItemInArray(combined, event.previousIndex, event.currentIndex);

    this.updateModel(
      'image_urls',
      combined
        .filter((i): i is ExistingItem => i.type === 'existing')
        .map((i) => i.url),
    );
    this.newPhotos.set(
      combined
        .filter((i): i is NewItem => i.type === 'new')
        .map((i) => i.photo),
    );
  }

  async editPhoto(file?: File | null, imageUrl?: string): Promise<void> {
    const data = {
      file: file ?? undefined,
      imageUrl: imageUrl ?? undefined,
      aspectRatios: [
        { titleKey: '1:1', descriptionKey: '1:1', ratio: 1 },
        { titleKey: '4:3', descriptionKey: '4:3', ratio: 4 / 3 },
        { titleKey: '16:9', descriptionKey: '16:9', ratio: 16 / 9 },
      ],
      allowFree: true,
      resizeToWidth: 1000,
      imageQuality: 75,
    };

    if (!data.file && !data.imageUrl) {
      this.isProcessingPhoto.set(false);
      return;
    }

    const result = await firstValueFrom(
      this.dialogs.open<File | null>(
        new PolymorpheusComponent(ImageEditorDialogComponent),
        {
          data,
          appearance: 'fullscreen',
          closable: false,
          dismissible: false,
        },
      ),
      { defaultValue: null },
    );

    this.isProcessingPhoto.set(false);

    if (result) {
      const reader = new FileReader();
      reader.onload = () => {
        this.newPhotos.update((photos) => [
          ...photos,
          {
            id: Math.random().toString(36).substring(2),
            file: result,
            preview: reader.result as string,
          },
        ]);
      };
      reader.readAsDataURL(result);
    }
  }

  protected async onDeleteExistingPhoto(): Promise<void> {}

  async save() {
    this.isSaving.set(true);
    try {
      const model = this.model();
      const payload: Partial<MerchandiseItemDetail> = { ...model };

      const newPhotoUrls: string[] = [];
      if (this.newPhotos().length > 0) {
        this.isUploading.set(true);
        for (const item of this.newPhotos()) {
          const url = await this.merchService.uploadShopImage(item.file);
          if (url) {
            newPhotoUrls.push(url);
          } else {
            throw new Error(
              this.translate.instant('merchandising.items.uploadError'),
            );
          }
        }
      }

      payload.image_urls = [...(model.image_urls || []), ...newPhotoUrls];

      const result = await this.merchService.upsertMerchandiseItem(payload);
      if (result) {
        this.toast.success(
          this.translate.instant('merchandising.items.saveSuccess'),
        );
        this.context.completeWith(result);
      } else {
        this.toast.error(
          this.translate.instant('merchandising.items.saveError'),
        );
      }
    } catch (e) {
      const error = e as Error;
      this.toast.error(
        error.message || this.translate.instant('errors.unexpected'),
      );
    } finally {
      this.isSaving.set(false);
      this.isUploading.set(false);
    }
  }
}
