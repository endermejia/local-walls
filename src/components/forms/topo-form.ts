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
  resource,
  signal,
  Signal,
  untracked,
} from '@angular/core';

import { injectContext, PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiIdentityMatcher, tuiIsString, TuiTime } from '@taiga-ui/cdk';
import { type TuiDialogContext } from '@taiga-ui/core';
import {
  TuiButton,
  TuiDataList,
  TuiDialogService,
  TuiIcon,
  TuiLabel,
  TuiOptGroup,
  TuiTitle,
  TuiCell,
  TuiInput,
  TuiCheckbox,
  TuiFilterByInputPipe,
  TuiDropdown,
} from '@taiga-ui/core';
import {
  TuiChevron,
  TUI_CONFIRM,
  TuiInputChip,
  TuiInputTime,
  TuiMultiSelect,
  TuiFiles,
  TuiInputFiles,
} from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import { GlobalData } from '../../services/global-data';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { ToposService } from '../../services/topos.service';
import { IndoorService } from '../../services/indoor.service';
import { ShadeInfoPipe } from '../../pipes/shade-info.pipe';

import { GradeComponent } from '../ui/avatar-grade';
import {
  ImageEditorDialogComponent,
  ImageEditorConfig,
} from '../dialogs/image-editor-dialog';

import {
  RouteDto,
  RouteWithExtras,
  TopoDetail,
  TopoDto,
  TopoInsertDto,
  TopoUpdateDto,
  VERTICAL_LIFE_GRADES,
  GRADE_NUMBER_TO_LABEL,
  IndoorTopoFormData,
  SelectedRoute,
} from '../../models';
import type { IndoorRouteDto } from '../../models/indoor.model';
import type { TopoPath, TopoRouteWithRoute } from '../../models/topo.model';

import { handleErrorToast, slugify } from '../../utils';

@Component({
  selector: 'app-topo-form',
  imports: [
    CommonModule,
    FormField,
    FormsModule,
    GradeComponent,
    ShadeInfoPipe,
    TranslatePipe,
    TuiButton,
    TuiCell,
    TuiCheckbox,
    TuiChevron,
    TuiDataList,
    TuiDropdown,
    TuiFiles,
    TuiFilterByInputPipe,
    TuiIcon,
    TuiInput,
    TuiInputChip,
    TuiInputFiles,
    TuiInputTime,
    TuiMultiSelect,
    TuiOptGroup,
    TuiTitle,
    TuiLabel,
  ],
  template: `
    <form
      class="flex flex-col w-full gap-4"
      (submit.zoneless)="onSubmit($event)"
    >
      <tui-textfield [tuiTextfieldCleaner]="false">
        <label tuiLabel for="name">{{ 'topos.name' | translate }}</label>
        <input
          tuiInput
          id="name"
          [formField]="topoForm.name"
          autocomplete="off"
        />
      </tui-textfield>

      <!-- Visibility indicator -->
      @let crag = global.cragDetail();
      @if (!isIndoor() && crag) {
        @let isSecret =
          !crag.is_public && (crag.price === null || crag.price === 0);
        <div class="flex items-center gap-2 px-1 text-xs opacity-75">
          <tui-icon
            [icon]="
              isSecret
                ? '@tui.lock'
                : crag.is_public
                  ? '@tui.globe'
                  : '@tui.credit-card'
            "
          />
          <span>
            {{
              (isSecret
                ? 'topos.visibility.secret'
                : crag.is_public
                  ? 'topos.visibility.public'
                  : 'topos.visibility.paywalled'
              ) | translate
            }}
          </span>
        </div>
      }

      @if (!isIndoor()) {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                tuiCheckbox
                type="checkbox"
                [formField]="topoForm.shade_morning"
                autocomplete="off"
              />
              <tui-icon
                [icon]="
                  ({ shade_morning: true, shade_afternoon: false } | shadeInfo)
                    ?.icon
                "
              />
              {{ 'filters.shade.morning' | translate }}
            </label>

            <label class="flex items-center gap-2 cursor-pointer">
              <input
                tuiCheckbox
                type="checkbox"
                [formField]="topoForm.shade_afternoon"
                autocomplete="off"
              />
              <tui-icon
                [icon]="
                  ({ shade_morning: false, shade_afternoon: true } | shadeInfo)
                    ?.icon
                "
              />
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
              [ngModel]="shadeChangeHourTime()"
              (ngModelChange)="onShadeChangeHourChange($event)"
              name="shade_change_hour"
              [disabled]="!showShadeChangeHour()"
            />
          </tui-textfield>
        </div>
      }

      <label class="flex items-center gap-2 cursor-pointer">
        <input tuiCheckbox type="checkbox" [formField]="topoForm.legacy" />
        <span>{{ 'topos.markAsLegacy' | translate }}</span>
      </label>

      <section class="grid gap-3">
        <!-- Header -->
        <div class="flex items-center justify-between px-1">
          <p class="text-sm font-bold uppercase tracking-wider opacity-60">
            {{ 'photo' | translate }}
          </p>
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
                [ngModel]="model().photoControl"
                (ngModelChange)="onPhotoControlChange($event)"
                name="photoControl"
                autocomplete="off"
              />
            </label>
          }

          <tui-files class="mt-2">
            @if (photoValue(); as file) {
              <div class="relative group">
                <tui-file
                  [file]="file"
                  (remove)="removePhotoFile()"
                  (click.zoneless)="editPhoto(file, undefined, $event)"
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
            } @else if (effectiveTopoData()?.photo; as photoPath) {
              @if (!isExistingPhotoDeleted()) {
                <div class="relative group">
                  <tui-file
                    [file]="{ name: photoPath }"
                    (remove)="onDeleteExistingPhoto()"
                    (click.zoneless)="
                      existingPhotoUrl()
                        ? editPhoto(null, existingPhotoUrl()!, $event)
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
            }
          </tui-files>

          <!-- Draw paths Button (Large and underneath) -->
          @if (
            (previewUrl() || existingPhotoUrl()) &&
            model().selectedRoutes.length > 0
          ) {
            <div class="mt-2">
              <button
                tuiButton
                type="button"
                appearance="accent"
                size="m"
                class="w-full rounded-xl!"
                [iconStart]="'/image/topo.svg'"
                (click)="openPathEditor()"
              >
                {{ 'draw' | translate }}
              </button>
            </div>
          }
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
          <label tuiLabel for="routes-select">{{ 'routes' | translate }}</label>
          <input
            tuiInputChip
            id="routes-select"
            autocomplete="off"
            [ngModel]="model().selectedRoutes"
            (ngModelChange)="onSelectedRoutesChange($event)"
            name="selectedRoutes"
            [placeholder]="'select' | translate"
          />
          <tui-input-chip *tuiItem />
          <tui-data-list *tuiDropdown>
            <tui-opt-group [label]="'routes' | translate" tuiMultiSelectGroup>
              @for (
                route of availableRoutes() | tuiFilterByInput;
                track route.id
              ) {
                <button type="button" new tuiOption [value]="route">
                  <div tuiCell size="s">
                    <app-grade
                      [grade]="route.grade ?? 0"
                      [kind]="route.climbing_kind"
                    />
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
          {{ 'cancel' | translate }}
        </button>
        @if (model().selectedRoutes.length > 0) {
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
          [disabled]="
            topoForm.name().invalid() || topoForm.shade_change_hour().invalid()
          "
          tuiButton
          appearance="primary"
          type="submit"
        >
          {{ (isEdit() ? 'save' : 'create') | translate }}
        </button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow min-h-0' },
})
export class TopoFormComponent {
  private readonly topos = inject(ToposService);
  protected readonly global = inject(GlobalData);
  private readonly location = inject(Location);
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly supabase = inject(SupabaseService);
  protected readonly indoor = inject(IndoorService);

  private readonly _dialogCtx: TuiDialogContext<
    string | boolean | null,
    {
      cragId?: number;
      topoData?: TopoDetail;
      initialRouteIds?: (number | string)[];
      type?: 'indoor' | 'outdoor';
      centerId?: string;
      indoorTopoData?: IndoorTopoFormData;
      initialRoutes?: (IndoorRouteDto & { path?: TopoPath | null })[];
    }
  > | null = (() => {
    try {
      return injectContext<
        TuiDialogContext<
          string | boolean | null,
          {
            cragId?: number;
            topoData?: TopoDetail;
            initialRouteIds?: (number | string)[];
            type?: 'indoor' | 'outdoor';
            centerId?: string;
            indoorTopoData?: IndoorTopoFormData;
            initialRoutes?: (IndoorRouteDto & { path?: TopoPath | null })[];
          }
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

  typeInput = input<'indoor' | 'outdoor'>('outdoor');

  protected readonly type: Signal<'indoor' | 'outdoor'> = computed(
    () => this._dialogCtx?.data?.type ?? this.typeInput(),
  );

  protected readonly isIndoor: Signal<boolean> = computed(
    () => this.type() === 'indoor',
  );

  private readonly dialogCragId = this._dialogCtx?.data?.cragId;
  private readonly dialogTopoData = computed(() => {
    const data = this._dialogCtx?.data;
    if (!data) return undefined;
    if (data.type === 'indoor' && data.indoorTopoData) {
      return {
        id: data.indoorTopoData.id,
        name: data.indoorTopoData.name,
        photo: data.indoorTopoData.image_url || data.indoorTopoData.photo,
        legacy: data.indoorTopoData.legacy,
        center_id: data.centerId,
        topo_routes: (data.initialRoutes || []).map((r, idx) => ({
          route_id: r.id,
          number: idx + 1,
          path: r.path,
          route: r,
        })),
      } as unknown as TopoDetail;
    }
    return data.topoData;
  });
  private readonly initialRouteIds =
    this._dialogCtx?.data?.initialRouteIds ?? [];

  protected readonly effectiveCragId: Signal<number | undefined> = computed(
    () => this.dialogCragId ?? this.cragId(),
  );
  protected readonly effectiveTopoData: Signal<TopoDetail | undefined> =
    computed(() => this.dialogTopoData() ?? this.topoData());

  readonly isEdit: Signal<boolean> = computed(() => {
    if (this.isIndoor()) {
      return !!this._dialogCtx?.data?.indoorTopoData;
    }
    return !!this.effectiveTopoData();
  });

  model = signal<{
    name: string;
    photo: string | null;
    shade_morning: boolean;
    shade_afternoon: boolean;
    shade_change_hour: string | null;
    selectedRoutes: SelectedRoute[];
    photoControl: File | null;
    legacy: boolean;
  }>({
    name: '',
    photo: null,
    shade_morning: false,
    shade_afternoon: false,
    shade_change_hour: null,
    selectedRoutes: [],
    photoControl: null,
    legacy: false,
  });

  topoForm = form(this.model, (path) => {
    required(path.name);
    required(path.shade_change_hour, {
      when: () => !this.isIndoor() && this.showShadeChangeHour(),
    });
  });

  protected readonly photoValue = computed(() => this.model().photoControl);
  protected readonly previewUrl = signal<string | null>(null);
  protected readonly isProcessingPhoto = signal(false);
  protected readonly isExistingPhotoDeleted = signal(false);
  protected pendingPaths = signal<
    {
      routeId: number | string;
      path: { points: { x: number; y: number }[]; color?: string };
    }[]
  >([]);
  private isInitialized = false;

  protected readonly indoorRoutes = resource({
    params: () => {
      const data = this._dialogCtx?.data;
      return data?.type === 'indoor' && data.centerId ? data.centerId : null;
    },
    loader: async ({ params: centerId }) => {
      if (!centerId) return [];
      await this.supabase.whenReady();
      const { data, error } = await this.supabase.client
        .from('indoor_routes')
        .select('*')
        .eq('center_id', centerId);
      if (error) throw error;
      return data || [];
    },
  });

  protected readonly existingPhotoUrl = resource({
    params: () => {
      const data = this.effectiveTopoData();
      if (!data?.photo || this.isExistingPhotoDeleted()) return null;
      return {
        path: data.photo,
        isIndoor: this.isIndoor(),
        version: this.isIndoor() ? 1 : this.global.topoPhotoVersion(),
      };
    },
    loader: async ({ params }) => {
      if (!params) return null;
      if (params.isIndoor) {
        return this.supabase.getPublicUrl('indoor-assets', params.path);
      }
      return await this.supabase.getTopoSignedUrl(params.path, params.version);
    },
  }).value;

  protected readonly showShadeChangeHour = computed(() => {
    const morning = this.model().shade_morning;
    const afternoon = this.model().shade_afternoon;
    return morning !== afternoon;
  });

  protected readonly availableRoutes = computed<SelectedRoute[]>(() => {
    if (this.isIndoor()) {
      return this.indoorRoutes.value() ?? [];
    }
    return this.global.cragRoutes() ?? [];
  });

  /** Route IDs that already appear in other topos of the same crag/center */
  protected readonly routeIdsInOtherTopos = computed(() => {
    if (this.isIndoor()) {
      const currentTopoId = this._dialogCtx?.data?.indoorTopoData?.id;
      const allRoutes = this.indoorRoutes.value() ?? [];
      const ids = new Set<string | number>();
      for (const r of allRoutes) {
        if (r.topo_id && r.topo_id !== currentTopoId) {
          ids.add(r.id);
        }
      }
      return ids;
    }
    const crag = this.global.cragDetail();
    const currentTopoId = this.effectiveTopoData()?.id;
    if (!crag?.topos) return new Set<number>();
    const ids = new Set<string | number>();
    for (const topo of crag.topos) {
      if (topo.id === currentTopoId) continue;
      for (const rid of topo.route_ids ?? []) {
        ids.add(rid);
      }
    }
    return ids;
  });

  protected readonly stringifyRoute = (route: SelectedRoute): string =>
    `${route.name} (${this.gradeStringify(route.grade ?? 0)})`;

  protected readonly routeIdentityMatcher: TuiIdentityMatcher<SelectedRoute> = (
    a,
    b,
  ) => a.id === b.id;

  protected gradeStringify(grade: number): string {
    return (
      GRADE_NUMBER_TO_LABEL[grade as VERTICAL_LIFE_GRADES] ||
      grade?.toString() ||
      ''
    );
  }

  protected readonly strings = tuiIsString;

  /** Converts the stored string (HH:MM) to TuiTime for TuiInputTime compatibility */
  protected readonly shadeChangeHourTime = computed(() => {
    const val = this.model().shade_change_hour;
    return val ? TuiTime.fromString(val) : null;
  });

  onShadeChangeHourChange(time: TuiTime | null): void {
    const val = time ? time.toString().slice(0, 5) : null;
    this.model.update((m) => ({ ...m, shade_change_hour: val }));
  }

  onPhotoControlChange(file: File | null): void {
    this.model.update((m) => ({ ...m, photoControl: file }));
    if (file) {
      this.editPhoto(file);
    }
  }

  onSelectedRoutesChange(routes: RouteDto[]): void {
    this.model.update((m) => ({ ...m, selectedRoutes: routes }));
  }

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

    // Eagerly initialize metadata fields for indoor topo editing
    // without waiting for availableRoutes (which may load slowly)
    effect(
      () => {
        if (!this.isIndoor()) return;
        const data = this._dialogCtx?.data?.indoorTopoData;
        if (!data) return;
        this.model.update((m) => ({
          ...m,
          name: data.name,
          photo: data.image_url || data.photo || null,
          legacy: data.legacy || false,
        }));
      },
      { allowSignalWrites: true },
    );

    effect(() => {
      const available = this.availableRoutes();
      if (!available.length || this.isInitialized) return;

      if (this.isIndoor()) {
        const data = this._dialogCtx?.data?.indoorTopoData;
        if (data) {
          const initialRoutes = this._dialogCtx?.data?.initialRoutes || [];
          this.model.update((m) => ({ ...m, selectedRoutes: initialRoutes }));
          this.isInitialized = true;
        } else if (this._dialogCtx?.data?.initialRoutes?.length) {
          const initialRoutes = this._dialogCtx?.data?.initialRoutes || [];
          this.model.update((m) => ({ ...m, selectedRoutes: initialRoutes }));
          this.isInitialized = true;
        }
      } else {
        const data = this.effectiveTopoData();
        if (data) {
          const sortedIds = (data.topo_routes || [])
            .sort((a, b) => a.number - b.number)
            .map((tr) => tr.route_id);

          let selected: RouteWithExtras[] = [];
          if (sortedIds.length) {
            const availableMap = new Map(available.map((r) => [r.id, r]));
            selected = sortedIds
              .map((id) => availableMap.get(id))
              .filter((r): r is RouteWithExtras => !!r);
          }

          this.model.set({
            name: data.name,
            photo: data.photo,
            shade_morning: data.shade_morning,
            shade_afternoon: data.shade_afternoon,
            shade_change_hour: data.shade_change_hour,
            selectedRoutes: selected,
            photoControl: null,
            legacy: false,
          });
          this.isInitialized = true;
        }

        if (!this.isInitialized && this.initialRouteIds.length) {
          const availableMap = new Map(available.map((r) => [r.id, r]));
          const selected = this.initialRouteIds
            .map((id) => availableMap.get(id))
            .filter((r): r is RouteWithExtras => !!r);
          this.model.update((m) => ({ ...m, selectedRoutes: selected }));
          this.isInitialized = true;
        }
      }
    });

    // Handle shade_change_hour reset
    effect(() => {
      const show = this.showShadeChangeHour();
      untracked(() => {
        if (!show && this.model().shade_change_hour !== null) {
          this.model.update((m) => ({ ...m, shade_change_hour: null }));
        }
      });
    });
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    submit(this.topoForm, async () => {
      if (this.isIndoor()) {
        const centerId = this._dialogCtx?.data?.centerId;
        if (!centerId) return;

        const { name, photo, selectedRoutes, legacy } = this.model();
        const indoorTopoData = this._dialogCtx?.data?.indoorTopoData;

        let finalImageUrl = photo || '';
        const photoFile = this.model().photoControl;
        if (photoFile) {
          const uploadedPath = await this.indoor.uploadAsset(
            centerId,
            photoFile,
          );
          if (uploadedPath) {
            finalImageUrl = uploadedPath;
          }
        }

        const payload = {
          center_id: centerId,
          name,
          image_url: finalImageUrl,
          climbing_kind: null,
          legacy: legacy || false,
          start_date: null,
          end_date: null,
        };

        try {
          let topoId: string | undefined;
          if (indoorTopoData) {
            await this.indoor.updateTopo(indoorTopoData.id, payload);
            topoId = indoorTopoData.id;
            this.toast.success('topos.updateSuccess');
          } else {
            const topo = await this.indoor.createTopo(payload);
            topoId = topo?.id;
            this.toast.success('topos.createSuccess');
          }

          if (topoId) {
            const initialIds = this.initialRouteIds as string[];
            const currentIds = selectedRoutes.map((r) => r.id as string);

            // 1. Remove route associations that are no longer selected
            const removedIds = initialIds.filter(
              (id) => !currentIds.includes(id),
            );
            if (removedIds.length > 0) {
              await this.supabase.client
                .from('indoor_topo_routes')
                .delete()
                .eq('topo_id', topoId)
                .in('route_id', removedIds);
            }

            // 2. Add or update route associations
            const upsertPromises = selectedRoutes.map((r, idx) => {
              const pendingPath =
                this.pendingPaths().find((p) => p.routeId === r.id)?.path ||
                null;
              const existingPath =
                'path' in r
                  ? (r as { path?: TopoPath | null }).path || null
                  : null;
              return this.supabase.client.from('indoor_topo_routes').upsert({
                topo_id: String(topoId),
                route_id: String(r.id),
                number: idx + 1,
                path: pendingPath || existingPath,
              });
            });
            await Promise.all(upsertPromises);
          }

          if (this._dialogCtx) {
            this._dialogCtx.completeWith(true);
          }
        } catch (e) {
          console.error('[TopoFormComponent] Error submitting indoor topo:', e);
          this.handleSubmitError(e);
        }
        return;
      }

      const crag_id = this.effectiveCragId();
      if (!crag_id && !this.isEdit()) return;

      const { name, photo, shade_morning, shade_afternoon, shade_change_hour } =
        this.model();

      if (this.isEdit()) {
        const payload: TopoUpdateDto = {
          name,
          photo,
          shade_morning,
          shade_afternoon,
          shade_change_hour,
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
          name,
          photo,
          shade_morning,
          shade_afternoon,
          shade_change_hour,
          crag_id: crag_id!,
          slug: (this.global.selectedCragSlug() || '') + '-' + slugify(name),
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
    });
  }

  private async handlePhotoUpload(topo: TopoDto | null): Promise<void> {
    const photoFile = this.model().photoControl;
    if (topo && photoFile) {
      await this.topos.uploadPhoto(topo.id, photoFile);
    }
  }

  private async handleTopoRoutes(topo: TopoDto | null): Promise<void> {
    if (!topo) return;

    const initial = new Set(this.initialRouteIds as number[]);
    const selectedRoutes = this.model().selectedRoutes;

    // 1. Remove routes that are no longer selected
    const removePromises: Promise<void>[] = [];
    for (const id of initial) {
      if (!selectedRoutes.some((r) => r.id === id)) {
        removePromises.push(this.topos.removeRoute(topo.id, id, false));
      }
    }
    await Promise.all(removePromises);

    // 2. Add or update routes with their current index as number
    const addUpdatePromises: Promise<void>[] = [];
    for (let i = 0; i < selectedRoutes.length; i++) {
      const route = selectedRoutes[i];
      if (!initial.has(Number(route.id))) {
        addUpdatePromises.push(
          this.topos.addRoute(
            {
              topo_id: topo.id,
              route_id: Number(route.id),
              number: i,
            },
            false,
          ),
        );
      } else {
        // Update existing route's number to reflect potential sorting
        addUpdatePromises.push(
          this.topos.updateRouteOrder(topo.id, Number(route.id), i, false),
        );
      }
    }
    await Promise.all(addUpdatePromises);

    // One final reload for all topo routes changes
    this.global.topoDetailResource.reload();
  }

  private async handleTopoPaths(topo: TopoDto | null): Promise<void> {
    if (!topo) return;
    const paths = this.pendingPaths();
    if (!paths.length) return;

    await this.topos.bulkUpdateRoutePaths(
      topo.id,
      paths.map((p) => ({
        routeId: Number(p.routeId),
        path: p.path as TopoPath,
      })),
    );
    this.pendingPaths.set([]);
  }

  private handleSubmitError(e: unknown): void {
    const error = e as Error;
    console.error('[TopoFormComponent] Error submitting topo:', error);
    handleErrorToast(error, this.toast);
  }

  protected removePhotoFile(): void {
    this.model.update((m) => ({ ...m, photoControl: null }));
  }

  async editPhoto(
    file?: File | null,
    imageUrl?: string,
    event?: Event,
  ): Promise<void> {
    if (event) {
      const target = event.target as HTMLElement;
      if (target.closest('button')) {
        return;
      }
    }

    const data: ImageEditorConfig = {
      file: file ?? undefined,
      imageUrl: imageUrl ?? undefined,
      maintainAspectRatio: false,
      allowFree: true,
      imageQuality: 100,
      resizeToWidth: 0,
      maxFileSize: 0,
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

    // Reset processing flag
    this.isProcessingPhoto.set(false);

    if (result && result instanceof File) {
      this.model.update((m) => ({ ...m, photoControl: result }));

      // Trigger preview update (NO auto-cascade to path editor)
      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl.set(reader.result as string);
      };
      reader.readAsDataURL(result);
    } else {
      // User cancelled.
      // If we were auto-triggered by a fresh pick (model has it, but no preview yet), maybe clear it.
      // But if we're EDITING an existing one, keep it.
      if (!imageUrl && !file) {
        this.model.update((m) => ({ ...m, photoControl: null }));
      }
    }
  }

  protected async onDeleteExistingPhoto(): Promise<void> {
    if (this.isIndoor()) {
      const indoorTopo = this._dialogCtx?.data?.indoorTopoData;
      if (!indoorTopo) return;
      const confirmed = await firstValueFrom(
        this.dialogs.open<boolean>(TUI_CONFIRM, {
          label: this.translate.instant('topos.deletePhotoTitle'),
          size: 's',
          data: {
            content: this.translate.instant('topos.deletePhotoConfirm'),
            yes: this.translate.instant('delete'),
            no: this.translate.instant('cancel'),
            appearance: 'negative',
          },
        }),
        { defaultValue: false },
      );
      if (confirmed) {
        try {
          await this.indoor.updateTopo(indoorTopo.id, { image_url: '' });
          this.isExistingPhotoDeleted.set(true);
        } catch (e) {
          console.error('[TopoFormComponent] Error deleting photo', e);
          handleErrorToast(e, this.toast);
        }
      }
      return;
    }

    const data = this.effectiveTopoData();
    if (!data || !data.photo) return;

    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('topos.deletePhotoTitle'),
        size: 's',
        data: {
          content: this.translate.instant('topos.deletePhotoConfirm'),
          yes: this.translate.instant('delete'),
          no: this.translate.instant('cancel'),
          appearance: 'negative',
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
        handleErrorToast(e, this.toast);
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
          yes: this.translate.instant('apply'),
          no: this.translate.instant('cancel'),
        },
      }),
      { defaultValue: false },
    );

    if (!confirmed) return;

    const routes = [...this.model().selectedRoutes];
    const pending = this.pendingPaths();

    let existingMap: Map<
      string | number,
      { path?: { points?: { x: number; y: number }[] } | null }
    >;
    if (this.isIndoor()) {
      const initial = this._dialogCtx?.data?.initialRoutes || [];
      existingMap = new Map(initial.map((e) => [e.id, { path: e.path }]));
    } else {
      const existing = this.effectiveTopoData()?.topo_routes || [];
      existingMap = new Map(existing.map((e) => [e.route_id, e]));
    }

    const pendingMap = new Map(pending.map((p) => [p.routeId, p]));

    const routesWithX = routes.map((r) => {
      const p = pendingMap.get(r.id);
      const e = existingMap.get(r.id);
      const points = p?.path?.points || e?.path?.points || [];
      const minX =
        points.length > 0 ? Math.min(...points.map((pt) => pt.x)) : 999;
      return { r, minX };
    });

    routesWithX.sort((a, b) => a.minX - b.minX);
    this.model.update((m) => ({
      ...m,
      selectedRoutes: routesWithX.map((item) => item.r),
    }));
  }

  protected async openPathEditor(overrideUrl?: string): Promise<void> {
    const topo = this.effectiveTopoData();
    const activeUrl =
      overrideUrl || this.previewUrl() || this.existingPhotoUrl();
    if (!activeUrl) return;

    const routes = (this.model().selectedRoutes || []).map((r, i) => {
      let existing: { number?: number; path?: TopoPath | null } | undefined;
      if (this.isIndoor()) {
        const initial = this._dialogCtx?.data?.initialRoutes || [];
        existing = initial.find((ir) => ir.id === r.id);
      } else {
        existing = this.effectiveTopoData()?.topo_routes?.find(
          (tr) => tr.route_id === r.id,
        );
      }

      const topo_id = this.isIndoor()
        ? Number(this._dialogCtx?.data?.indoorTopoData?.id || 0)
        : topo?.id || 0;
      return {
        topo_id,
        route_id: Number(r.id),
        number: (existing?.number || i) + 1,
        route: { ...r, own_ascent: null, project: false },
        path:
          this.pendingPaths().find((p) => p.routeId === r.id)?.path ||
          existing?.path ||
          null,
      };
    });

    const result = await this.topos.openTopoPathEditor({
      imageUrl: activeUrl,
      topoRoutes: routes as TopoRouteWithRoute[],
      topoName:
        (this.isIndoor()
          ? this._dialogCtx?.data?.indoorTopoData?.name
          : topo?.name) || this.model().name,
      standalone: false, // Don't save to DB directly, return the paths
    });

    if (result && typeof result === 'object' && result.saved) {
      if (result.paths) {
        this.pendingPaths.set(result.paths);
      }
      if (result.routeIds) {
        const current = this.model().selectedRoutes;
        const sorted = result.routeIds
          .map((id) => current.find((r) => r.id === id || r.id === String(id)))
          .filter((r): r is SelectedRoute => r !== undefined);
        this.model.update((m) => ({ ...m, selectedRoutes: sorted }));
      }
    }
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
