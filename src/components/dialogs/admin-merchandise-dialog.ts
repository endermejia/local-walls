import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  TuiButton,
  TuiLabel,
  TuiTextfield,
  TuiDataList,
  TuiIcon,
  TuiDialogService,
  TuiLoader,
} from '@taiga-ui/core';
import {
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
import { injectContext, PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiDialogContext } from '@taiga-ui/experimental';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { MerchandiseItem } from '../../models';
import { MerchandiseService } from '../../services/merchandise.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { ImageEditorDialogComponent } from './image-editor-dialog';

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
    TuiLabel,
    TuiTextfield,
    TuiInputNumber,
    TuiTextarea,
    TuiSwitch,
    TuiSelect,
    TuiDataListWrapper,
    TuiChevron,
    TuiDataList,
    TuiIcon,
    TuiFiles,
    TuiFileRejectedPipe,
    TuiLoader,
    TranslatePipe,
  ],
  template: `
    <div class="flex flex-col gap-6">
      <div class="grid grid-cols-1 gap-4">
        <!-- Name -->
        <tui-textfield class="w-full">
          <label tuiLabel for="name">{{ 'userName' | translate }}</label>
          <input
            id="name"
            tuiTextfield
            type="text"
            [ngModel]="model().name"
            (ngModelChange)="updateModel('name', $event)"
            name="name"
          />
        </tui-textfield>

        <!-- Category -->
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
          <tui-data-list-wrapper
            *tuiTextfieldDropdown
            new
            [items]="categories"
          />
        </tui-textfield>

        <div class="grid grid-cols-2 gap-4">
          <!-- Price -->
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

          <!-- Stock -->
          <tui-textfield class="w-full">
            <label tuiLabel for="stock">{{
              'merchandising.items.stock' | translate
            }}</label>
            <input
              id="stock"
              tuiInputNumber
              [min]="0"
              [ngModel]="model().stock"
              (ngModelChange)="updateModel('stock', $event)"
              name="stock"
            />
          </tui-textfield>
        </div>

        <!-- Sizes & Colors -->
        <div class="grid grid-cols-2 gap-4">
          <tui-textfield class="w-full">
            <label tuiLabel for="available_sizes">{{
              'merchandising.items.sizes' | translate
            }}</label>
            <input
              id="available_sizes"
              tuiTextfield
              type="text"
              [ngModel]="sizesString()"
              (ngModelChange)="updateArrayModel('available_sizes', $event)"
              name="available_sizes"
              placeholder="S,M,L,XL"
            />
          </tui-textfield>

          <tui-textfield class="w-full">
            <label tuiLabel for="available_colors">{{
              'merchandising.items.colors' | translate
            }}</label>
            <input
              id="available_colors"
              tuiTextfield
              type="text"
              [ngModel]="colorsString()"
              (ngModelChange)="updateArrayModel('available_colors', $event)"
              name="available_colors"
              placeholder="Black,White,Red"
            />
          </tui-textfield>
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
                        class="absolute inset-0 bg-[var(--tui-background-neutral-1)]/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <tui-icon
                          icon="@tui.pencil"
                          class="text-[var(--tui-text-primary-on-accent-1)] text-3xl"
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
                      class="absolute inset-0 bg-[var(--tui-background-neutral-1)]/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <tui-icon
                        icon="@tui.pencil"
                        class="text-[var(--tui-text-primary-on-accent-1)] text-3xl"
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
          class="flex items-center justify-between gap-4 p-4 rounded-xl bg-[var(--tui-base-02)]"
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
        <tui-loader [showLoader]="isSaving() || isUploading()" [overlay]="true">
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
      TuiDialogContext<MerchandiseItem | null, MerchandiseItem | undefined>
    >();
  private readonly merchService = inject(MerchandiseService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly supabase = inject(SupabaseService);

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
    stock: this.context.data?.stock || 0,
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

  protected sizesString() {
    return this.model().available_sizes?.join(', ') || '';
  }

  protected colorsString() {
    return this.model().available_colors?.join(', ') || '';
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

  updateArrayModel(key: 'available_sizes' | 'available_colors', value: string) {
    const arr = value
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    this.updateModel(key, arr);
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
          closeable: false,
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
