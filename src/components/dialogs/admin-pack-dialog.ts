import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  OnInit,
} from '@angular/core';

import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';

import {
  COMMON_IMAGE_EDITOR_CONFIG,
  createNewPhoto,
  fileToDataUrl,
  NewPhoto,
  reorderGallery,
  extractErrorMessage,
} from '../../utils';

import { injectContext, PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiDialogContext } from '@taiga-ui/core';
import { TuiIdentityMatcher, tuiIsString } from '@taiga-ui/cdk';
import {
  TuiButton,
  TuiLabel,
  TuiIcon,
  TuiDialogService,
  TuiLoader,
  TuiDataList,
  TuiOptGroup,
  TuiTitle,
  TuiHint,
  TuiCell,
  TuiInput,
  TuiFilterByInputPipe,
} from '@taiga-ui/core';
import {
  TuiInputNumber,
  TuiTextarea,
  TuiFiles,
  TuiInputFiles,
  TuiSwitch,
  TuiInputChip,
  TuiChevron,
  TuiMultiSelect,
} from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import { AreasService } from '../../services/areas.service';
import { MerchandiseService } from '../../services/merchandise.service';

import { ToastService } from '../../services/toast.service';

import { ImageEditorDialogComponent } from './image-editor-dialog';

import { AreaPackDetail } from '../../models';

interface SimpleArea {
  id: number;
  name: string;
  slug: string;
}

@Component({
  selector: 'app-admin-pack-dialog',
  standalone: true,
  imports: [
    CdkDrag,
    CdkDropList,
    CommonModule,
    FormsModule,
    TranslatePipe,
    TuiButton,
    TuiCell,
    TuiChevron,
    TuiDataList,
    TuiFiles,
    TuiFilterByInputPipe,
    TuiHint,
    TuiIcon,
    TuiInput,
    TuiInputChip,
    TuiInputFiles,
    TuiInputNumber,
    TuiLabel,
    TuiLoader,
    TuiMultiSelect,
    TuiOptGroup,
    TuiSwitch,
    TuiTextarea,
    TuiTitle,
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
        <tui-textfield
          multi
          tuiChevron
          class="w-full"
          [stringify]="stringifyArea"
          [disabledItemHandler]="strings"
          [identityMatcher]="areaIdentityMatcher"
          [tuiTextfieldCleaner]="true"
        >
          <label tuiLabel for="areas">{{
            'merchandising.packs.areas' | translate
          }}</label>
          <input
            tuiInputChip
            id="areas"
            [ngModel]="model().selectedAreas"
            (ngModelChange)="updateModel('selectedAreas', $event)"
            [disabled]="loadingAreas()"
            [placeholder]="'select' | translate"
          />
          <tui-input-chip *tuiItem />
          <tui-data-list *tuiDropdown>
            <tui-opt-group [label]="'areas' | translate" tuiMultiSelectGroup>
              @for (area of allAreas() | tuiFilterByInput; track area.id) {
                <button type="button" new tuiOption [value]="area">
                  <div tuiCell size="s">
                    <tui-icon icon="@tui.map-pin" class="opacity-30" />
                    <div tuiTitle>
                      {{ area.name }}
                      @if (areaIdsInOtherPacks().has(area.id)) {
                        <tui-icon
                          icon="@tui.package"
                          class="text-xs opacity-50"
                          style="font-size: 0.85rem"
                          [tuiHint]="
                            'merchandising.packs.alreadyInPack' | translate
                          "
                        />
                      }
                    </div>
                  </div>
                </button>
              }
            </tui-opt-group>
          </tui-data-list>
        </tui-textfield>

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
                <img
                  [src]="url"
                  [alt]="'merchandising.items.gallery' | translate"
                  class="w-full h-full object-cover"
                />
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
                <img
                  [src]="item.preview"
                  [alt]="'merchandising.items.newPhoto' | translate"
                  class="w-full h-full object-cover"
                />
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
export class AdminPackDialogComponent implements OnInit {
  readonly context =
    injectContext<TuiDialogContext<boolean, AreaPackDetail | undefined>>();
  private readonly merchService = inject(MerchandiseService);
  private readonly areasService = inject(AreasService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly dialogs = inject(TuiDialogService);

  readonly isSaving = signal(false);
  readonly isUploading = signal(false);
  readonly allAreas = signal<SimpleArea[]>([]);
  readonly loadingAreas = signal(true);
  readonly areaIdsInOtherPacks = signal<Set<number>>(new Set());

  protected readonly newPhotos = signal<NewPhoto[]>([]);
  protected readonly isProcessingPhoto = signal(false);
  protected readonly fileInputModel = signal<File[] | null>(null);

  protected readonly model = signal({
    id: this.context.data?.id,
    name: this.context.data?.name || '',
    price: this.context.data?.price || 0,
    description: this.context.data?.description || '',
    image_urls: this.context.data?.image_urls || ([] as string[]),
    active: this.context.data?.active ?? true,
    selectedAreas: [] as SimpleArea[],
  });

  readonly stringifyArea = (item: SimpleArea) => item.name;

  protected readonly areaIdentityMatcher: TuiIdentityMatcher<SimpleArea> = (
    a,
    b,
  ) => a.id === b.id;

  protected readonly strings = tuiIsString;

  async ngOnInit() {
    try {
      const areas = await this.areasService.getAllAreasSimple();
      this.allAreas.set(areas);

      if (this.context.data?.items) {
        const selected = this.context.data.items
          .map((i: AreaPackDetail['items'][number]) =>
            areas.find((a: SimpleArea) => a.id === i.area_id),
          )
          .filter((a: SimpleArea | undefined): a is SimpleArea => !!a);
        this.updateModel('selectedAreas', selected);
      }

      // Identify areas in other packs
      const allPacks = await this.merchService.getAreaPacks(false);
      const otherPacks = allPacks.filter((p) => p.id !== this.context.data?.id);
      const otherIds = new Set<number>();
      for (const pack of otherPacks) {
        for (const item of pack.items || []) {
          otherIds.add(item.area_id);
        }
      }
      this.areaIdsInOtherPacks.set(otherIds);
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
    const { imageUrls, newPhotos } = reorderGallery(
      event,
      this.model().image_urls,
      this.newPhotos(),
    );
    this.updateModel('image_urls', imageUrls);
    this.newPhotos.set(newPhotos);
  }

  async editPhoto(file?: File | null, imageUrl?: string): Promise<void> {
    const data = {
      ...COMMON_IMAGE_EDITOR_CONFIG,
      file: file ?? undefined,
      imageUrl: imageUrl ?? undefined,
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
      const preview = await fileToDataUrl(result);
      this.newPhotos.update((photos) => [
        ...photos,
        createNewPhoto(result, preview),
      ]);
    }
  }

  async save() {
    this.isSaving.set(true);
    try {
      const model = this.model();
      const { selectedAreas, ...modelData } = model;

      const newPhotoUrls: string[] = [];
      if (this.newPhotos().length > 0) {
        this.isUploading.set(true);
        for (const item of this.newPhotos()) {
          const url = await this.merchService.uploadShopImage(item.file);
          if (url) {
            newPhotoUrls.push(url);
          } else {
            throw new Error(
              this.translate.instant('merchandising.packs.uploadError'),
            );
          }
        }
      }

      const payload: Partial<AreaPackDetail> = {
        ...modelData,
        image_urls: [...(model.image_urls || []), ...newPhotoUrls],
        items: selectedAreas.map((a) => ({
          area_id: a.id,
          area: a,
        })) as AreaPackDetail['items'],
      };

      const result = await this.merchService.upsertAreaPack(payload);
      if (result) {
        this.toast.success(
          this.translate.instant('merchandising.packs.saveSuccess'),
        );
        this.context.completeWith(true);
      } else {
        this.toast.error(
          this.translate.instant('merchandising.packs.saveError'),
        );
      }
    } catch (error) {
      console.error('[AdminPackDialogComponent] Error saving pack:', error);
      this.toast.error(
        extractErrorMessage(error) ||
          this.translate.instant('errors.unexpected'),
      );
    } finally {
      this.isSaving.set(false);
      this.isUploading.set(false);
    }
  }
}
