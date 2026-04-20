import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

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
  TuiFileRejectedPipe,
  TUI_CONFIRM,
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
    TuiButton,
    TuiChevron,
    TuiDataList,
    TuiDataListWrapper,
    TuiFileRejectedPipe,
    TuiFiles,
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

        <!-- Image -->
        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between px-1">
            <span class="text-xs font-bold opacity-60 uppercase">{{
              'ascent.photo' | translate
            }}</span>
            <div class="flex items-center gap-2">
              @if (model().image_url && !photoValue()) {
                <button
                  tuiButton
                  type="button"
                  appearance="negative"
                  size="s"
                  iconStart="@tui.trash"
                  (click)="onDeleteExistingPhoto()"
                >
                  {{ 'ascent.deletePhoto' | translate }}
                </button>
              }
            </div>
          </div>

          <div class="grid gap-2">
            @if (!photoValue() && !model().image_url) {
              <label tuiInputFiles>
                <input
                  accept="image/*"
                  tuiInputFiles
                  [ngModel]="model().photoControl"
                  (ngModelChange)="onPhotoFileChange($event)"
                  name="photoControl"
                />
              </label>
            }

            <tui-files class="mt-2">
              @if (
                photoValue()
                  | tuiFileRejected
                    : { accept: 'image/*', maxFileSize: 5 * 1024 * 1024 }
                  | async;
                as file
              ) {
                <tui-file
                  state="error"
                  [file]="file"
                  (remove)="removePhotoFile()"
                />
              }

              @if (photoValue(); as file) {
                <div class="relative group">
                  <tui-file
                    [file]="file"
                    (remove)="removePhotoFile()"
                    (click.zoneless)="editPhoto(file)"
                  />
                  @if (previewUrl()) {
                    <div
                      class="mt-2 rounded-xl overflow-hidden relative group cursor-pointer"
                      (click.zoneless)="editPhoto(file)"
                    >
                      <img
                        [src]="previewUrl()"
                        class="w-full h-auto max-h-48 object-cover"
                        alt="Preview"
                      />
                      <div
                        class="absolute inset-0 bg-(--tui-background-neutral-1)/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <tui-icon
                          icon="@tui.pencil"
                          class="text-(--tui-text-primary-on-accent-1) text-3xl"
                        />
                      </div>
                    </div>
                  }
                </div>
              }

              @if (model().image_url; as photoUrl) {
                @if (!photoValue()) {
                  <div
                    class="rounded-xl overflow-hidden relative group cursor-pointer"
                    (click.zoneless)="editPhoto(null, photoUrl)"
                  >
                    <img
                      [src]="photoUrl"
                      class="w-full h-auto max-h-48 object-cover"
                      alt="Existing photo"
                    />
                    <div
                      class="absolute inset-0 bg-(--tui-background-neutral-1)/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <tui-icon
                        icon="@tui.pencil"
                        class="text-(--tui-text-primary-on-accent-1) text-3xl"
                      />
                    </div>
                  </div>
                }
              }
            </tui-files>
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

  protected readonly photoValue = computed(() => this.model().photoControl);
  protected readonly previewUrl = signal<string | null>(null);
  protected readonly isProcessingPhoto = signal(false);

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
    image_url: this.context.data?.image_url || '',
    active: this.context.data?.active ?? true,
    available_sizes: this.context.data?.available_sizes || [],
    available_colors: this.context.data?.available_colors || [],
    photoControl: null as File | null,
  });

  constructor() {
    effect(() => {
      const file = this.photoValue();
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          this.previewUrl.set(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        this.previewUrl.set(null);
      }
    });
  }

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

  onPhotoFileChange(file: File | null): void {
    if (file) {
      this.isProcessingPhoto.set(true);
      this.editPhoto(file, undefined);
    } else {
      this.model.update((m: ReturnType<typeof this.model>) => ({
        ...m,
        photoControl: null,
      }));
    }
  }

  removePhotoFile(): void {
    this.model.update((m: ReturnType<typeof this.model>) => ({
      ...m,
      photoControl: null,
    }));
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
      this.model.update((m: ReturnType<typeof this.model>) => ({
        ...m,
        photoControl: result,
      }));
    } else if (file) {
      // If we were editing a NEW file and cancelled, keep the file?
      // AscentForm clears it. Let's follow AscentForm.
      this.model.update((m: ReturnType<typeof this.model>) => ({
        ...m,
        photoControl: null,
      }));
    }
  }

  protected async onDeleteExistingPhoto(): Promise<void> {
    const photoUrl = this.model().image_url;
    if (!photoUrl) return;

    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('ascent.deletePhotoTitle'),
        size: 's',
        data: {
          content: this.translate.instant('ascent.deletePhotoConfirm'),
          yes: this.translate.instant('delete'),
          no: this.translate.instant('cancel'),
          appearance: 'negative',
        },
      }),
      { defaultValue: false },
    );

    if (confirmed) {
      this.updateModel('image_url', '');
    }
  }

  async save() {
    this.isSaving.set(true);
    try {
      const { photoControl, ...payload } = this.model();

      if (photoControl) {
        this.isUploading.set(true);
        const url = await this.merchService.uploadShopImage(photoControl);
        if (url) {
          payload.image_url = url;
        } else {
          throw new Error(
            this.translate.instant('merchandising.items.uploadError'),
          );
        }
      }

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
      this.toast.error(
        e instanceof Error
          ? e.message
          : this.translate.instant('errors.unexpected'),
      );
    } finally {
      this.isSaving.set(false);
      this.isUploading.set(false);
    }
  }
}
