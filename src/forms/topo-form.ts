import { CommonModule, Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  InputSignal,
  resource,
  signal,
  Signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { TuiIdentityMatcher, tuiIsString, TuiTime } from '@taiga-ui/cdk';
import {
  TuiButton,
  TuiDataList,
  TuiDialogService,
  TuiIcon,
  TuiLabel,
  TuiOptGroup,
  TuiTextfield,
  TuiTitle,
} from '@taiga-ui/core';
import { type TuiDialogContext } from '@taiga-ui/experimental';
import {
  TuiCheckbox,
  TuiChevron,
  TUI_CONFIRM,
  TuiFilterByInputPipe,
  TuiInputChip,
  TuiInputTime,
  tuiInputTimeOptionsProvider,
  TuiMultiSelect,
  TuiFiles,
  TuiInputFiles,
} from '@taiga-ui/kit';
import { TuiCell } from '@taiga-ui/layout';
import { injectContext, PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom, startWith } from 'rxjs';

import {
  RouteDto,
  RouteWithExtras,
  TopoDetail,
  TopoDto,
  TopoInsertDto,
  TopoUpdateDto,
  VERTICAL_LIFE_GRADES,
  VERTICAL_LIFE_TO_LABEL,
  ImageEditorResult,
} from '../models';

import {
  GlobalData,
  SupabaseService,
  ToastService,
  ToposService,
} from '../services';

import { ImageEditorDialogComponent } from '../dialogs/image-editor-dialog';
import { AvatarGradeComponent } from '../components/avatar-grade';

import { handleErrorToast, slugify } from '../utils';

@Component({
  selector: 'app-topo-form',
  imports: [
    AvatarGradeComponent,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslatePipe,
    TuiButton,
    TuiCell,
    TuiCheckbox,
    TuiChevron,
    TuiDataList,
    TuiFilterByInputPipe,
    TuiIcon,
    TuiInputChip,
    TuiInputTime,
    TuiLabel,
    TuiMultiSelect,
    TuiOptGroup,
    TuiTextfield,
    TuiTitle,
    TuiFiles,
    TuiInputFiles,
  ],
  template: `
    <form
      class="flex flex-col w-full gap-4"
      (submit.zoneless)="onSubmit($event)"
    >
      <tui-textfield [tuiTextfieldCleaner]="false">
        <label tuiLabel for="name">{{ 'topos.name' | translate }}</label>
        <input tuiTextfield id="name" [formControl]="name" autocomplete="off" />
      </tui-textfield>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input tuiCheckbox type="checkbox" [formControl]="shade_morning" />
            <tui-icon icon="@tui.sunset" />
            {{ 'filters.shade.morning' | translate }}
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              tuiCheckbox
              type="checkbox"
              [formControl]="shade_afternoon"
            />
            <tui-icon icon="@tui.sunrise" />
            {{ 'filters.shade.afternoon' | translate }}
          </label>
        </div>

        <tui-textfield [style.opacity]="showShadeChangeHour() ? '1' : '0.5'">
          <label tuiLabel for="shade_change_hour">{{
            'topos.shadeChangeHour' | translate
          }}</label>
          <input
            tuiInputTime
            id="shade_change_hour"
            autocomplete="off"
            [formControl]="shade_change_hour"
          />
        </tui-textfield>
      </div>

      <section class="grid gap-3">
        <div class="flex items-center justify-between px-1">
          <div class="flex items-center gap-2">
            @if (
              isEdit() &&
              topoData()?.photo &&
              !photoValue() &&
              !isExistingPhotoDeleted()
            ) {
              @if (existingPhotoUrl(); as url) {
                <button
                  tuiButton
                  type="button"
                  appearance="neutral"
                  size="s"
                  iconStart="@tui.edit-2"
                  (click)="editPhoto(null, url)"
                >
                  {{ 'actions.edit' | translate }}
                </button>
              }
              <button
                tuiButton
                type="button"
                appearance="neutral"
                size="s"
                iconStart="@tui.pencil"
                (click)="openPathEditor()"
              >
                {{ 'actions.draw' | translate }}
              </button>
            }
          </div>
        </div>

        <div class="grid gap-2">
          @if (
            !photoValue() &&
            (!effectiveTopoData()?.photo || isExistingPhotoDeleted())
          ) {
            <label tuiInputFiles>
              <input
                accept="image/*"
                tuiInputFiles
                [formControl]="photoControl"
              />
            </label>
          }

          <tui-files class="mt-2">
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
                        icon="@tui.edit-2"
                        class="text-[var(--tui-text-primary-on-accent-1)] text-3xl"
                      />
                    </div>
                  </div>
                }
              </div>
            } @else if (effectiveTopoData()?.photo; as photoPath) {
              @if (!isExistingPhotoDeleted()) {
                <div class="relative group">
                  <tui-file
                    [file]="{ name: photoPath }"
                    (remove)="onDeleteExistingPhoto()"
                    (click.zoneless)="
                      existingPhotoUrl()
                        ? editPhoto(null, existingPhotoUrl()!)
                        : null
                    "
                  />
                  @if (existingPhotoUrl(); as url) {
                    <div
                      class="mt-2 rounded-xl overflow-hidden relative group cursor-pointer"
                      (click.zoneless)="editPhoto(null, url)"
                    >
                      <img
                        [src]="url"
                        class="w-full h-auto max-h-48 object-cover"
                        alt="Existing photo"
                      />
                      <div
                        class="absolute inset-0 bg-[var(--tui-background-neutral-1)]/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <tui-icon
                          icon="@tui.edit-2"
                          class="text-[var(--tui-text-primary-on-accent-1)] text-3xl"
                        />
                      </div>
                    </div>
                  }
                </div>
              }
            }
          </tui-files>
        </div>
      </section>

      <div class="mt-4">
        <h3 class="text-lg font-semibold mb-2">
          {{ 'topos.manageRoutes' | translate }}
        </h3>
        <tui-textfield
          multi
          tuiChevron
          [stringify]="stringifyRoute"
          [disabledItemHandler]="strings"
          [identityMatcher]="routeIdentityMatcher"
          [tuiTextfieldCleaner]="true"
        >
          <label tuiLabel for="routes-select">{{
            'labels.routes' | translate
          }}</label>
          <input
            tuiInputChip
            id="routes-select"
            autocomplete="off"
            [formControl]="selectedRoutes"
            [placeholder]="'actions.select' | translate"
          />
          <tui-input-chip *tuiItem />
          <tui-data-list *tuiTextfieldDropdown>
            <tui-opt-group label="Vias" tuiMultiSelectGroup>
              @for (
                route of availableRoutes() | tuiFilterByInput;
                track route.id
              ) {
                <button type="button" new tuiOption [value]="route">
                  <div tuiCell size="s">
                    <app-avatar-grade [grade]="route.grade" />
                    <div tuiTitle>
                      {{ route.name }}
                      @if (routeIdsInOtherTopos().has(route.id)) {
                        <tui-icon
                          icon="@tui.image"
                          class="text-xs opacity-50"
                          style="font-size: 0.85rem"
                        />
                      }
                    </div>
                  </div>
                </button>
              }
            </tui-opt-group>
          </tui-data-list>
        </tui-textfield>
      </div>

      <div class="flex flex-wrap gap-2 justify-end mt-4">
        <button
          tuiButton
          appearance="secondary"
          type="button"
          (click.zoneless)="goBack()"
        >
          {{ 'actions.cancel' | translate }}
        </button>
        @if (selectedRoutes.value.length > 0) {
          <button
            tuiButton
            appearance="flat"
            type="button"
            (click)="sortRoutesByPosition()"
          >
            <tui-icon icon="@tui.list-ordered" class="mr-2" />
            {{ 'topos.editor.sort' | translate }}
          </button>
        }
        <button
          [disabled]="name.invalid || shade_change_hour.invalid"
          tuiButton
          appearance="primary"
          type="submit"
        >
          {{ (isEdit() ? 'actions.save' : 'actions.create') | translate }}
        </button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow min-h-0' },
  providers: [
    tuiInputTimeOptionsProvider({
      valueTransformer: {
        fromControlValue(controlValue: string): TuiTime | null {
          return controlValue ? TuiTime.fromString(controlValue) : null;
        },
        toControlValue(time: TuiTime | null): string {
          return time ? time.toString().slice(0, 5) : '';
        },
      },
    }),
  ],
})
export class TopoFormComponent {
  private readonly topos = inject(ToposService);
  private readonly global = inject(GlobalData);
  private readonly location = inject(Location);
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly supabase = inject(SupabaseService);

  private readonly _dialogCtx: TuiDialogContext<
    string | boolean | null,
    { cragId?: number; topoData?: TopoDetail; initialRouteIds?: number[] }
  > | null = (() => {
    try {
      return injectContext<
        TuiDialogContext<
          string | boolean | null,
          { cragId?: number; topoData?: TopoDetail; initialRouteIds?: number[] }
        >
      >();
    } catch {
      return null;
    }
  })();

  cragId: InputSignal<number | undefined> = input<number | undefined>(
    undefined,
  );
  topoData: InputSignal<TopoDetail | undefined> = input<TopoDetail | undefined>(
    undefined,
  );

  private readonly dialogCragId = this._dialogCtx?.data?.cragId;
  private readonly dialogTopoData = this._dialogCtx?.data?.topoData;
  private readonly initialRouteIds =
    this._dialogCtx?.data?.initialRouteIds ?? [];

  protected readonly effectiveCragId: Signal<number | undefined> = computed(
    () => this.dialogCragId ?? this.cragId(),
  );
  protected readonly effectiveTopoData: Signal<TopoDetail | undefined> =
    computed(() => this.dialogTopoData ?? this.topoData());

  readonly isEdit: Signal<boolean> = computed(() => !!this.effectiveTopoData());

  name = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  photo = new FormControl<string | null>(null);
  shade_morning = new FormControl<boolean>(false, { nonNullable: true });
  shade_afternoon = new FormControl<boolean>(false, { nonNullable: true });
  shade_change_hour = new FormControl<string | null>(null);
  selectedRoutes = new FormControl<readonly RouteDto[]>([], {
    nonNullable: true,
  });

  protected readonly photoControl = new FormControl<File | null>(null);
  protected readonly photoValue = toSignal(
    this.photoControl.valueChanges.pipe(startWith(this.photoControl.value)),
    { initialValue: null },
  );
  protected readonly previewUrl = signal<string | null>(null);
  protected readonly isProcessingPhoto = signal(false);
  protected readonly isExistingPhotoDeleted = signal(false);
  protected pendingPaths = signal<
    {
      routeId: number;
      path: { points: { x: number; y: number }[]; color?: string };
    }[]
  >([]);
  private isInitialized = false;

  protected readonly existingPhotoUrl = resource({
    params: () => {
      const data = this.effectiveTopoData();
      if (!data?.photo || this.isExistingPhotoDeleted()) return null;
      return data.photo;
    },
    loader: async ({ params }) => {
      if (!params) return null;
      return await this.supabase.getTopoSignedUrl(params);
    },
  }).value;

  private readonly shadeMorningSignal = toSignal(
    this.shade_morning.valueChanges.pipe(startWith(this.shade_morning.value)),
    { initialValue: this.shade_morning.value },
  );
  private readonly shadeAfternoonSignal = toSignal(
    this.shade_afternoon.valueChanges.pipe(
      startWith(this.shade_afternoon.value),
    ),
    { initialValue: this.shade_afternoon.value },
  );

  protected readonly showShadeChangeHour = computed(() => {
    const morning = this.shadeMorningSignal();
    const afternoon = this.shadeAfternoonSignal();
    return morning !== afternoon;
  });

  protected readonly availableRoutes = computed(
    () => this.global.cragRoutesResource.value() ?? [],
  );

  /** Route IDs that already appear in other topos of the same crag */
  protected readonly routeIdsInOtherTopos = computed(() => {
    const crag = this.global.cragDetailResource.value();
    const currentTopoId = this.effectiveTopoData()?.id;
    if (!crag?.topos) return new Set<number>();
    const ids = new Set<number>();
    for (const topo of crag.topos) {
      if (topo.id === currentTopoId) continue;
      for (const rid of topo.route_ids ?? []) {
        ids.add(rid);
      }
    }
    return ids;
  });

  protected readonly stringifyRoute = (route: RouteDto): string =>
    `${route.name} (${this.gradeStringify(route.grade)})`;

  protected readonly routeIdentityMatcher: TuiIdentityMatcher<RouteDto> = (
    a,
    b,
  ) => a.id === b.id;

  protected gradeStringify(grade: number): string {
    return (
      VERTICAL_LIFE_TO_LABEL[grade as VERTICAL_LIFE_GRADES] ||
      grade?.toString() ||
      ''
    );
  }

  protected readonly strings = tuiIsString;

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

    // Auto-open editor when a new file is selected from file input
    this.photoControl.valueChanges.subscribe((file) => {
      if (file && !this.isProcessingPhoto()) {
        this.isProcessingPhoto.set(true);
        this.editPhoto(file, undefined);
      }
    });

    effect(() => {
      const data = this.effectiveTopoData();
      const available = this.availableRoutes();
      if (!available.length || this.isInitialized) return;

      if (data) {
        this.name.setValue(data.name);
        this.photo.setValue(data.photo);
        this.shade_morning.setValue(data.shade_morning);
        this.shade_afternoon.setValue(data.shade_afternoon);
        this.shade_change_hour.setValue(data.shade_change_hour);

        const sortedIds = (data.topo_routes || [])
          .sort((a, b) => a.number - b.number)
          .map((tr) => tr.route_id);

        if (sortedIds.length) {
          const selected = sortedIds
            .map((id) => available.find((r) => r.id === id))
            .filter((r): r is RouteWithExtras => !!r);
          this.selectedRoutes.setValue(selected, { emitEvent: false });
          this.isInitialized = true;
        }
      }

      if (!this.isInitialized && this.initialRouteIds.length) {
        const selected = this.initialRouteIds
          .map((id) => available.find((r) => r.id === id))
          .filter((r): r is RouteWithExtras => !!r);
        this.selectedRoutes.setValue(selected, { emitEvent: false });
        this.isInitialized = true;
      }
    });

    // Reset shade_change_hour if both are the same and enable/disable
    effect(() => {
      const show = this.showShadeChangeHour();
      if (!show) {
        this.shade_change_hour.setValue(null);
        this.shade_change_hour.disable();
        this.shade_change_hour.setValidators(null);
      } else {
        this.shade_change_hour.enable();
        this.shade_change_hour.setValidators([Validators.required]);
      }
      this.shade_change_hour.updateValueAndValidity();
    });
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.name.invalid) return;

    const crag_id = this.effectiveCragId();
    if (!crag_id && !this.isEdit()) return;

    if (this.isEdit()) {
      const payload: TopoUpdateDto = {
        name: this.name.value,
        photo: this.photo.value,
        shade_morning: this.shade_morning.value,
        shade_afternoon: this.shade_afternoon.value,
        shade_change_hour: this.shade_change_hour.value,
        crag_id: crag_id!,
      };

      try {
        const topo = await this.topos.update(
          this.effectiveTopoData()!.id,
          payload,
        );
        await this.handlePhotoUpload(topo);
        await this.handleTopoRoutes(topo);
        await this.handleTopoPaths(topo);
        if (this._dialogCtx) {
          this._dialogCtx.completeWith(topo?.slug || true);
        }
      } catch (e) {
        this.handleSubmitError(e);
      }
    } else {
      const payload: TopoInsertDto = {
        name: this.name.value,
        photo: this.photo.value,
        shade_morning: this.shade_morning.value,
        shade_afternoon: this.shade_afternoon.value,
        shade_change_hour: this.shade_change_hour.value,
        crag_id: crag_id!,
        slug:
          (this.global.selectedCragSlug() || '') +
          '-' +
          slugify(this.name.value),
      };

      try {
        const topo = await this.topos.create(payload);
        await this.handlePhotoUpload(topo);
        await this.handleTopoRoutes(topo);
        await this.handleTopoPaths(topo);
        if (this._dialogCtx) {
          this._dialogCtx.completeWith(topo?.slug || true);
        }
      } catch (e) {
        this.handleSubmitError(e);
      }
    }
  }

  private async handlePhotoUpload(topo: TopoDto | null): Promise<void> {
    const photoFile = this.photoControl.value;
    if (topo && photoFile) {
      await this.topos.uploadPhoto(topo.id, photoFile);
    }
  }

  private async handleTopoRoutes(topo: TopoDto | null): Promise<void> {
    if (!topo) return;

    const initial = new Set(this.initialRouteIds);
    const selectedRoutes = this.selectedRoutes.value;

    // 1. Remove routes that are no longer selected
    for (const id of initial) {
      if (!selectedRoutes.some((r) => r.id === id)) {
        await this.topos.removeRoute(topo.id, id, false);
      }
    }

    // 2. Add or update routes with their current index as number
    for (let i = 0; i < selectedRoutes.length; i++) {
      const route = selectedRoutes[i];
      if (!initial.has(route.id)) {
        await this.topos.addRoute(
          {
            topo_id: topo.id,
            route_id: route.id,
            number: i,
          },
          false,
        );
      } else {
        // Update existing route's number to reflect potential sorting
        await this.topos.updateRouteOrder(topo.id, route.id, i, false);
      }
    }

    // One final reload for all topo routes changes
    this.global.topoDetailResource.reload();
  }

  private async handleTopoPaths(topo: TopoDto | null): Promise<void> {
    if (!topo) return;
    const paths = this.pendingPaths();
    if (!paths.length) return;

    for (const p of paths) {
      await this.topos.updateRoutePath(topo.id, p.routeId, p.path);
    }
    this.pendingPaths.set([]);
  }

  private handleSubmitError(e: unknown): void {
    const error = e as Error;
    console.error('[TopoFormComponent] Error submitting topo:', error);
    handleErrorToast(error, this.toast);
  }

  protected removePhotoFile(): void {
    this.photoControl.setValue(null);
  }

  async editPhoto(file?: File | null, imageUrl?: string): Promise<void> {
    const data = {
      file: file ?? undefined,
      imageUrl: imageUrl ?? undefined,
      maintainAspectRatio: false,
      allowFree: true,
      allowDrawing: true,
      topoRoutes: (this.selectedRoutes.value || []).map((r, i) => {
        const existing = this.effectiveTopoData()?.topo_routes?.find(
          (tr) => tr.route_id === r.id,
        );
        return {
          topo_id: this.effectiveTopoData()?.id || 0,
          route_id: r.id,
          number: (existing?.number || i) + 1,
          route: { ...r, own_ascent: null, project: false },
          path:
            this.pendingPaths().find((p) => p.routeId === r.id)?.path ||
            existing?.path ||
            null,
        };
      }),
      initialMode: imageUrl ? ('draw' as const) : undefined,
    };

    if (!data.file && !data.imageUrl) {
      this.isProcessingPhoto.set(false);
      return;
    }

    const result = await firstValueFrom(
      this.dialogs.open<ImageEditorResult | File | null>(
        new PolymorpheusComponent(ImageEditorDialogComponent),
        {
          data,
          appearance: 'fullscreen',
          closeable: false,
          dismissible: false,
        },
      ),
    );

    // Reset processing flag
    this.isProcessingPhoto.set(false);

    if (result) {
      const isEditorResult = typeof result === 'object' && 'file' in result;
      const file = isEditorResult
        ? result.file
        : result instanceof File
          ? result
          : null;

      if (file) {
        this.photoControl.setValue(file, { emitEvent: false });
        if (isEditorResult) {
          if (result.paths) {
            this.pendingPaths.set(result.paths);
          }
          if (result.routeIds) {
            const current = this.selectedRoutes.value;
            const sorted = result.routeIds
              .map((id) => current.find((r) => r.id === id))
              .filter((r): r is RouteWithExtras => !!r);
            this.selectedRoutes.setValue(sorted);
          }
        }

        // Manually trigger preview update
        const reader = new FileReader();
        reader.onload = () => {
          this.previewUrl.set(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    } else {
      // User cancelled, clear the photo
      this.photoControl.setValue(null);
    }
  }

  protected async onDeleteExistingPhoto(): Promise<void> {
    const data = this.effectiveTopoData();
    if (!data || !data.photo) return;

    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('topos.deletePhotoTitle'),
        size: 's',
        data: {
          content: this.translate.instant('topos.deletePhotoConfirm'),
          yes: this.translate.instant('actions.delete'),
          no: this.translate.instant('actions.cancel'),
        },
      }),
      { defaultValue: false },
    );

    if (confirmed) {
      try {
        await this.topos.deletePhoto(data.id);
        this.isExistingPhotoDeleted.set(true);
        // Reload topo in global state to reflect photo deletion
        this.global.topoDetailResource.reload();
      } catch (e) {
        console.error('[TopoFormComponent] Error deleting photo', e);
        handleErrorToast(e as Error, this.toast);
      }
    }
  }

  protected async sortRoutesByPosition(): Promise<void> {
    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('topos.editor.sort'),
        size: 's',
        data: {
          content: this.translate.instant('topos.editor.sortConfirm'),
          yes: this.translate.instant('actions.apply'),
          no: this.translate.instant('actions.cancel'),
        },
      }),
      { defaultValue: false },
    );

    if (!confirmed) return;

    const routes = [...this.selectedRoutes.value];
    const pending = this.pendingPaths();
    const existing = this.effectiveTopoData()?.topo_routes || [];

    const routesWithX = routes.map((r) => {
      const p = pending.find((path) => path.routeId === r.id);
      const e = existing.find((tr) => tr.route_id === r.id);
      const points = p?.path?.points || e?.path?.points || [];
      const minX =
        points.length > 0 ? Math.min(...points.map((pt) => pt.x)) : 999;
      return { r, minX };
    });

    routesWithX.sort((a, b) => a.minX - b.minX);
    this.selectedRoutes.setValue(routesWithX.map((item) => item.r));
  }

  protected openPathEditor(): void {
    const topo = this.effectiveTopoData();
    const url = this.existingPhotoUrl();
    if (!topo || !url) return;

    this._dialogCtx?.completeWith(false); // Close form first
    this.topos.openTopoPathEditor({ topo, imageUrl: url });
  }

  goBack(): void {
    if (this._dialogCtx) {
      this._dialogCtx.$implicit.complete();
    } else {
      this.location.back();
    }
  }
}

export default TopoFormComponent;
