import { CommonModule, Location } from '@angular/common';
import { form, FormField, required, submit } from '@angular/forms/signals';
import { FormsModule } from '@angular/forms';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  InputSignal,
  Signal,
  signal,
  untracked,
} from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { firstValueFrom } from 'rxjs';

import { injectContext, PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { type TuiDialogContext } from '@taiga-ui/core';
import {
  TuiButton,
  TuiError,
  TuiLabel,
  TuiInput,
  TuiTextfield,
  TuiNumberFormat,
} from '@taiga-ui/core';
import { TuiTextarea, TuiInputNumber, TuiFiles } from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { IndoorService } from '../../services/indoor.service';
import { GlobalData } from '../../services/global-data';
import { ToastService } from '../../services/toast.service';
import { SupabaseService } from '../../services/supabase.service';
import { MapService } from '../../services/map.service';
import {
  handleErrorToast,
  slugify,
  COMMON_IMAGE_EDITOR_CONFIG,
  fileToDataUrl,
  createNewPhoto,
  NewPhoto,
  reorderGallery,
} from '../../utils';
import { IndoorCenterDto } from '../../models';
import { ImageEditorDialogComponent } from '../dialogs/image-editor-dialog';
import { TuiDialogService, TuiIcon, TuiLoader } from '@taiga-ui/core';

@Component({
  selector: 'app-indoor-center-form',
  standalone: true,
  imports: [
    CommonModule,
    FormField,
    FormsModule,
    TranslatePipe,
    TuiButton,
    TuiError,
    TuiInput,
    TuiInputNumber,
    TuiLabel,
    TuiNumberFormat,
    TuiTextarea,
    TuiTextfield,
    TuiFiles,
    TuiIcon,
    TuiLoader,
    CdkDrag,
    CdkDropList,
  ],
  template: `
    <form class="grid gap-4" (submit.zoneless)="onSubmit($event)">
      <tui-textfield class="block">
        <label tuiLabel for="center-name">{{ 'name' | translate }}</label>
        <input
          tuiInput
          id="center-name"
          [formField]="centerForm.name"
          type="text"
          autocomplete="off"
        />
      </tui-textfield>
      @if (centerForm.name().invalid() && centerForm.name().touched()) {
        <tui-error [error]="'errors.required' | translate" />
      }

      <tui-textfield class="block">
        <label tuiLabel for="center-city">{{ 'city' | translate }}</label>
        <input
          tuiInput
          id="center-city"
          [formField]="centerForm.city"
          type="text"
          autocomplete="off"
        />
      </tui-textfield>

      <tui-textfield class="block">
        <label tuiLabel for="center-desc">{{
          'description' | translate
        }}</label>
        <textarea
          tuiTextarea
          id="center-desc"
          [formField]="$any(centerForm.description)"
          class="h-32"
        ></textarea>
      </tui-textfield>

      <div class="flex flex-wrap items-center gap-4">
        <h3 class="font-bold text-lg">{{ 'location' | translate }}</h3>
        <button
          tuiButton
          appearance="secondary-grayscale"
          size="s"
          type="button"
          iconStart="@tui.map-pin"
          (click.zoneless)="pickLocation()"
        >
          {{ 'pickOnMap' | translate }}
        </button>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <tui-textfield [tuiTextfieldCleaner]="false">
          <label tuiLabel for="lat">{{ 'lat' | translate }}</label>
          <input
            tuiInputNumber
            id="lat"
            [ngModel]="model().latitude"
            (ngModelChange)="onLatChange($event)"
            name="latitude"
            [tuiNumberFormat]="{ precision: 6 }"
            (paste)="onPasteLocation($event)"
            (change.zoneless)="sanitizeCoordinates()"
            autocomplete="off"
          />
        </tui-textfield>
        <tui-textfield [tuiTextfieldCleaner]="false">
          <label tuiLabel for="lng">{{ 'lng' | translate }}</label>
          <input
            tuiInputNumber
            id="lng"
            [tuiNumberFormat]="{ precision: 6 }"
            [ngModel]="model().longitude"
            (ngModelChange)="onLngChange($event)"
            name="longitude"
            (change.zoneless)="sanitizeCoordinates()"
            autocomplete="off"
          />
        </tui-textfield>
      </div>

      <!-- Gallery -->
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between px-1">
          <h3 class="font-bold text-lg">
            {{ 'merchandising.items.gallery' | translate }}
          </h3>
          <label tuiInputFiles>
            <input
              accept="image/*"
              type="file"
              tuiInputFiles
              multiple
              [ngModel]="null"
              [ngModelOptions]="{ standalone: true }"
              (change)="onFilesChange($event)"
            />
            <button
              tuiButton
              type="button"
              appearance="secondary-grayscale"
              size="s"
              iconStart="@tui.plus"
            >
              {{ 'merchandising.items.addImage' | translate }}
            </button>
          </label>
        </div>

        <div
          class="grid grid-cols-2 sm:grid-cols-4 gap-3"
          cdkDropList
          cdkDropListOrientation="mixed"
          (cdkDropListDropped)="dropImage($event)"
        >
          @for (img of model().gallery_urls; track img) {
            <div
              cdkDrag
              class="relative aspect-square rounded-xl overflow-hidden border border-(--tui-border-normal) group cursor-grab active:cursor-grabbing"
            >
              <img
                [src]="supabase.getPublicUrl('indoor-assets', img)"
                class="w-full h-full object-cover"
                alt="Gallery image"
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
                    (click)="removeExistingImage(img)"
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
                class="w-full h-full object-cover"
                alt="New photo"
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
            </div>
          }
        </div>
      </div>

      <div class="flex flex-wrap gap-2 justify-end mt-4">
        <button
          tuiButton
          appearance="secondary"
          type="button"
          (click.zoneless)="goBack()"
        >
          {{ 'cancel' | translate }}
        </button>
        <tui-loader [loading]="isSaving() || isUploading()" [overlay]="true">
          <button
            [disabled]="centerForm.name().invalid()"
            tuiButton
            appearance="primary"
            type="submit"
          >
            {{ (isEdit() ? 'save' : 'create') | translate }}
          </button>
        </tui-loader>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
})
export class IndoorCenterFormComponent {
  private readonly indoor = inject(IndoorService);
  protected readonly global = inject(GlobalData);
  private readonly location = inject(Location);
  protected readonly supabase = inject(SupabaseService);
  private readonly toast = inject(ToastService);
  protected readonly mapService = inject(MapService);

  private readonly _dialogCtx: TuiDialogContext<
    string | boolean | null,
    { centerData?: Partial<IndoorCenterDto> }
  > | null = (() => {
    try {
      return injectContext<
        TuiDialogContext<
          string | boolean | null,
          { centerData?: Partial<IndoorCenterDto> }
        >
      >();
    } catch {
      return null;
    }
  })();

  centerData: InputSignal<Partial<IndoorCenterDto> | undefined> = input<
    Partial<IndoorCenterDto> | undefined
  >(undefined);

  private readonly effectiveCenterData: Signal<
    Partial<IndoorCenterDto> | undefined
  > = computed(() => this._dialogCtx?.data?.centerData ?? this.centerData());

  readonly isEdit: Signal<boolean> = computed(
    () => !!this.effectiveCenterData()?.id,
  );

  readonly isSaving = signal(false);
  readonly isUploading = signal(false);
  protected readonly newPhotos = signal<NewPhoto[]>([]);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);

  model = signal<{
    name: string;
    slug: string;
    city: string;
    description: string;
    latitude: number | null;
    longitude: number | null;
    gallery_urls: string[];
  }>({
    name: '',
    slug: '',
    city: '',
    description: '',
    latitude: null,
    longitude: null,
    gallery_urls: [],
  });

  centerForm = form(this.model, (path) => {
    required(path.name);
  });

  private editingId: string | null = null;

  constructor() {
    effect(() => {
      const data = this.effectiveCenterData();
      if (!data) return;
      this.editingId = data.id || null;
      this.model.update((m) => ({
        ...m,
        name: data.name || '',
        slug: data.slug || '',
        city: data.city || '',
        description: data.description || '',
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        gallery_urls: data.gallery_urls || [],
      }));
    });

    // Auto-slug generation
    effect(async () => {
      if (this.isEdit()) return;
      const name = this.model().name;
      if (!name) return;

      const baseSlug = slugify(name);
      const uniqueSlug = await this.supabase.getUniqueSlug(
        'indoor_centers',
        baseSlug,
      );

      untracked(() => {
        const currentSlug = this.model().slug;
        if (currentSlug !== uniqueSlug) {
          this.model.update((m) => ({ ...m, slug: uniqueSlug }));
        }
      });
    });
  }

  async onFilesChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const fileArray = Array.from(input.files);
    // Reset the input value so the change event triggers even for the same file
    // and to clear the internal state of the input
    input.value = '';

    for (const file of fileArray) {
      await this.editPhoto(file);
    }
  }

  async editPhoto(file?: File | null, imageUrl?: string): Promise<void> {
    const data = {
      ...COMMON_IMAGE_EDITOR_CONFIG,
      file: file ?? undefined,
      imageUrl: imageUrl ?? undefined,
    };

    if (!data.file && !data.imageUrl) return;

    console.log(
      '[IndoorCenterFormComponent] Opening ImageEditorDialogComponent',
    );
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

    console.log(
      '[IndoorCenterFormComponent] ImageEditorDialogComponent result:',
      result,
    );

    if (result) {
      const preview = await fileToDataUrl(result);
      this.newPhotos.update((photos) => [
        ...photos,
        createNewPhoto(result, preview),
      ]);
      console.log(
        '[IndoorCenterFormComponent] Added new photo. Total new photos:',
        this.newPhotos().length,
      );
    }
  }

  removeExistingImage(url: string): void {
    this.model.update((m) => ({
      ...m,
      gallery_urls: m.gallery_urls.filter((u) => u !== url),
    }));
  }

  removeNewPhoto(id: string): void {
    this.newPhotos.update((photos) => photos.filter((p) => p.id !== id));
  }

  dropImage(event: CdkDragDrop<unknown[]>): void {
    const { imageUrls, newPhotos } = reorderGallery(
      event,
      this.model().gallery_urls,
      this.newPhotos(),
    );
    this.model.update((m) => ({ ...m, gallery_urls: imageUrls }));
    this.newPhotos.set(newPhotos);
  }

  async onSubmit(event?: Event): Promise<void> {
    event?.preventDefault();
    event?.stopPropagation();

    submit(this.centerForm, async () => {
      this.isSaving.set(true);
      try {
        const model = this.model();
        const newPhotoUrls: string[] = [];

        if (this.newPhotos().length > 0) {
          this.isUploading.set(true);
          const centerId = this.editingId;
          if (!centerId)
            throw new Error('Cannot upload photos without a center ID');

          for (const item of this.newPhotos()) {
            const path = await this.indoor.uploadAsset(centerId, item.file);
            if (path) {
              newPhotoUrls.push(path);
            }
          }
        }

        const payload: Omit<IndoorCenterDto, 'id' | 'created_at'> = {
          name: model.name,
          slug: model.slug,
          city: model.city || null,
          description: model.description || null,
          avatar_url: this.effectiveCenterData()?.avatar_url ?? null,
          latitude: model.latitude,
          longitude: model.longitude,
          contact_info: this.effectiveCenterData()?.contact_info ?? null,
          country: this.effectiveCenterData()?.country ?? null,
          gallery_urls: [...model.gallery_urls, ...newPhotoUrls],
          schedule: this.effectiveCenterData()?.schedule ?? null,
          location: this.effectiveCenterData()?.location ?? null,
        };

        if (this.isEdit()) {
          if (this.editingId == null) return;
          await this.indoor.updateCenter(this.editingId, payload);
        } else {
          await this.indoor.createCenter(payload);
        }

        this.toast.success(
          this.translate.instant('merchandising.items.saveSuccess'),
        );

        if (this._dialogCtx) {
          this._dialogCtx.completeWith(true);
        } else {
          this.global.indoorCentersResource.reload();
          this.global.editingMode.set(false);
        }
      } catch (e) {
        const error = e as Error;
        console.error('[IndoorCenterFormComponent] Error submitting:', e);
        handleErrorToast(error, this.toast);
      } finally {
        this.isSaving.set(false);
        this.isUploading.set(false);
      }
    });
  }

  goBack(): void {
    if (this._dialogCtx) {
      this._dialogCtx.$implicit.complete();
    } else {
      this.location.back();
    }
  }

  onLatChange(value: number | null): void {
    this.model.update((m) => ({ ...m, latitude: value }));
  }

  onLngChange(value: number | null): void {
    this.model.update((m) => ({ ...m, longitude: value }));
  }

  async pickLocation(): Promise<void> {
    const result = await import('rxjs').then((m) =>
      m.firstValueFrom(
        this.mapService.pickLocation(
          this.model().latitude,
          this.model().longitude,
        ),
      ),
    );
    if (result) {
      this.model.update((m) => ({
        ...m,
        latitude: result.lat,
        longitude: result.lng,
      }));
    }
  }

  onPasteLocation(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text');
    if (!text) return;

    const coords = this.mapService.parseCoordinates(text);
    if (coords) {
      event.preventDefault();
      this.model.update((m) => ({
        ...m,
        latitude: coords.lat,
        longitude: coords.lng,
      }));
    }
  }

  sanitizeCoordinates(): void {
    const lat = this.model().latitude;
    const lng = this.model().longitude;
    this.model.update((m) => ({
      ...m,
      latitude: lat != null ? parseFloat(lat.toFixed(6)) : null,
      longitude: lng != null ? parseFloat(lng.toFixed(6)) : null,
    }));
  }
}
