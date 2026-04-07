import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  OnInit,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  TuiButton,
  TuiLabel,
  TuiTextfield,
  TuiIcon,
  TuiDialogService,
  TuiLoader,
} from '@taiga-ui/core';
import {
  TuiInputNumber,
  TuiTextarea,
  TuiMultiSelect,
  TuiDataListWrapper,
  TuiFiles,
  TuiInputFiles,
  TuiFileRejectedPipe,
  TUI_CONFIRM,
} from '@taiga-ui/kit';
import { injectContext, PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiDialogContext } from '@taiga-ui/experimental';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { AreaPackDetail } from '../../models';
import { MerchandiseService } from '../../services/merchandise.service';
import { AreasService } from '../../services/areas.service';
import { ToastService } from '../../services/toast.service';
import { SupabaseService } from '../../services/supabase.service';
import { ImageEditorDialogComponent } from './image-editor-dialog';

interface SimpleArea {
  id: number;
  name: string;
  slug: string;
}

@Component({
  selector: 'app-admin-pack-dialog',
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
    TuiMultiSelect,
    TuiDataListWrapper,
    TuiIcon,
    TuiFiles,
    TuiInputFiles,
    TuiFileRejectedPipe,
    TuiLoader,
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
          />
        </tui-textfield>

        <!-- Price -->
        <tui-textfield class="w-full">
          <label tuiLabel for="price">{{ 'price' | translate }}</label>
          <input
            id="price"
            tuiInputNumber
            [min]="0"
            [ngModel]="model().price"
            (ngModelChange)="updateModel('price', $event)"
          />
          <span class="tui-textfield__suffix">€</span>
        </tui-textfield>

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
          ></textarea>
        </tui-textfield>

        <!-- Areas Selection -->
        <tui-textfield class="w-full" [stringify]="stringifyArea">
          <label tuiLabel for="areas">Areas Included</label>
          <tui-multi-select
            id="areas"
            [ngModel]="selectedAreas"
            (ngModelChange)="onAreasChange($event)"
            [disabled]="loadingAreas()"
          >
            <tui-data-list-wrapper
              *tuiTextfieldDropdown
              [items]="allAreas()"
            ></tui-data-list-wrapper>
          </tui-multi-select>
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
      </div>

      <div class="flex justify-end gap-3 px-1 mt-4">
        <button
          tuiButton
          appearance="flat"
          type="button"
          (click)="context.completeWith(false)"
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
export class AdminPackDialogComponent implements OnInit {
  readonly context =
    injectContext<TuiDialogContext<boolean, AreaPackDetail | undefined>>();
  private readonly merchService = inject(MerchandiseService);
  private readonly areasService = inject(AreasService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly supabase = inject(SupabaseService);

  readonly isSaving = signal(false);
  readonly isUploading = signal(false);
  readonly allAreas = signal<SimpleArea[]>([]);
  readonly loadingAreas = signal(true);

  protected selectedAreas: SimpleArea[] = [];

  protected readonly photoValue = computed(() => this.model().photoControl);
  protected readonly previewUrl = signal<string | null>(null);
  protected readonly isProcessingPhoto = signal(false);

  protected readonly model = signal({
    id: this.context.data?.id,
    name: this.context.data?.name || '',
    price: this.context.data?.price || 0,
    description: this.context.data?.description || '',
    image_url: this.context.data?.image_url || '',
    photoControl: null as File | null,
  });

  readonly stringifyArea = (item: SimpleArea) => item.name;

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

  async ngOnInit() {
    try {
      const areas = await this.areasService.getAllAreasSimple();
      this.allAreas.set(areas);

      if (this.context.data?.items) {
        this.selectedAreas = this.context.data.items
          .map((i: AreaPackDetail['items'][number]) =>
            areas.find((a: SimpleArea) => a.id === i.area_id),
          )
          .filter((a: SimpleArea | undefined): a is SimpleArea => !!a);
      }
    } finally {
      this.loadingAreas.set(false);
    }
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

  onAreasChange(areas: SimpleArea[]) {
    this.selectedAreas = areas;
  }

  async save() {
    this.isSaving.set(true);
    try {
      const { photoControl, ...modelData } = this.model();
      const payload: Partial<AreaPackDetail> = {
        ...modelData,
        items: this.selectedAreas.map((a) => ({
          area_id: a.id,
          area: a,
        })) as AreaPackDetail['items'],
      };

      if (photoControl) {
        this.isUploading.set(true);
        const url = await this.merchService.uploadShopImage(photoControl);
        if (url) {
          payload.image_url = url;
        } else {
          throw new Error('Failed to upload image');
        }
      }

      const result = await this.merchService.upsertAreaPack(payload);
      if (result) {
        this.toast.success('Pack saved successfully');
        this.context.completeWith(true);
      } else {
        this.toast.error('Failed to save pack');
      }
    } catch (e) {
      const error = e as Error;
      console.error('[AdminPackDialogComponent] Error saving pack:', e);
      this.toast.error(error.message || 'Error unexpected');
    } finally {
      this.isSaving.set(false);
      this.isUploading.set(false);
    }
  }
}
