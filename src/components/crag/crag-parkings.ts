import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  PLATFORM_ID,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TuiAvatar, TUI_CONFIRM, type TuiConfirmData } from '@taiga-ui/kit';
import {
  TuiAppearance,
  TuiDialogService,
  TuiIcon,
  TuiButton,
} from '@taiga-ui/core';
import { firstValueFrom } from 'rxjs';

import { GlobalData } from '../../services/global-data';
import { ParkingsService } from '../../services/parkings.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { EmptyStateComponent } from '../ui/empty-state';
import { CragDetail, ParkingDto } from '../../models';
import { handleErrorToast, mapLocationUrl } from '../../utils';

@Component({
  selector: 'app-crag-parkings',
  imports: [
    TranslatePipe,
    TuiAvatar,
    TuiAppearance,
    TuiButton,
    TuiIcon,
    EmptyStateComponent,
  ],
  template: `
    <div class="flex items-center justify-between gap-2 mb-4">
      <div class="flex items-center w-full sm:w-auto gap-2">
        <tui-avatar
          tuiThumbnail
          size="l"
          src="@tui.parking-square"
          class="self-center"
          [attr.aria-label]="'parkings' | translate"
        />
        <h2 class="text-2xl font-semibold">
          {{ 'parkings' | translate }}
        </h2>
      </div>
      @if (canAreaAdmin()) {
        <div class="flex gap-2 flex-wrap sm:flex-nowrap justify-end">
          <button
            tuiButton
            appearance="textfield"
            size="s"
            type="button"
            (click.zoneless)="openLinkParking()"
            [iconStart]="'@tui.link'"
          >
            {{ 'link' | translate }}
          </button>
          <button
            tuiButton
            appearance="textfield"
            size="s"
            type="button"
            (click.zoneless)="openCreateParking()"
            [iconStart]="'@tui.plus'"
          >
            {{ 'new' | translate }}
          </button>
        </div>
      }
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      @for (p of crag()?.parkings; track p.id) {
        <div
          tuiAppearance="flat"
          class="p-4 rounded-3xl flex flex-col justify-between"
        >
          <div class="flex flex-col gap-3">
            <div class="flex items-start justify-between gap-2 ">
              <div class="flex flex-wrap gap-2">
                <span tuiTitle class="!text-lg">{{ p.name }}</span>
              </div>

              @if (p.size) {
                <div
                  class="flex flex-nowrap items-center gap-1 opacity-80 whitespace-nowrap"
                >
                  <tui-icon icon="@tui.car" />
                  <span class="text-lg"> x {{ p.size }} </span>
                </div>
              }

              @if (canEditAsAdmin() || canAreaAdmin()) {
                <div class="flex gap-1">
                  <button
                    size="s"
                    appearance="neutral"
                    iconStart="@tui.square-pen"
                    tuiIconButton
                    type="button"
                    class="!rounded-full"
                    (click.zoneless)="openEditParking(p)"
                  >
                    {{ 'edit' | translate }}
                  </button>
                  <button
                    size="s"
                    appearance="negative"
                    iconStart="@tui.unlink"
                    tuiIconButton
                    type="button"
                    class="!rounded-full"
                    (click.zoneless)="removeParking(p)"
                  >
                    {{ 'unlink' | translate }}
                  </button>
                </div>
              }
            </div>

            @if (p.latitude && p.longitude) {
              <div class="flex flex-wrap gap-2 mt-2">
                <button
                  tuiButton
                  appearance="secondary"
                  size="s"
                  type="button"
                  class="!rounded-full"
                  (click.zoneless)="viewOnMap(p.latitude, p.longitude)"
                  [iconStart]="'@tui.map-pin'"
                >
                  {{ 'viewOnMap' | translate }}
                </button>
                <button
                  appearance="secondary"
                  size="s"
                  tuiButton
                  type="button"
                  class="!rounded-full lw-icon-50"
                  [iconStart]="'/image/google-maps.svg'"
                  (click.zoneless)="
                    openExternal(
                      mapLocationUrl({
                        latitude: p.latitude,
                        longitude: p.longitude,
                      })
                    )
                  "
                  [attr.aria-label]="'openGoogleMaps' | translate"
                >
                  {{ 'openGoogleMaps' | translate }}
                </button>
              </div>
            }
          </div>
        </div>
      } @empty {
        <div class="col-span-full">
          <app-empty-state icon="@tui.car" />
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CragParkingsComponent {
  crag = input.required<CragDetail | null>();

  protected readonly global = inject(GlobalData);
  protected readonly parkingsService = inject(ParkingsService);
  protected readonly supabase = inject(SupabaseService);
  protected readonly translate = inject(TranslateService);
  protected readonly dialogs = inject(TuiDialogService);
  protected readonly toast = inject(ToastService);
  protected readonly platformId = inject(PLATFORM_ID);
  protected readonly router = inject(Router);

  protected readonly mapLocationUrl = mapLocationUrl;

  readonly canEditAsAdmin = this.global.canEditAsAdmin;
  readonly canAreaAdmin = computed(() => {
    const c = this.crag();
    if (!c) return false;
    return this.global.areaAdminPermissions()[c.area_id];
  });

  openCreateParking(): void {
    const c = this.crag();
    if (!c) return;
    this.parkingsService.openParkingForm({
      cragId: c.id,
      defaultLocation:
        c.latitude && c.longitude
          ? { lat: c.latitude, lng: c.longitude }
          : undefined,
    });
  }

  openLinkParking(): void {
    const c = this.crag();
    if (!c) return;
    const existingParkingIds = c.parkings.map((p) => p.id);
    this.parkingsService.openLinkParkingForm({
      cragId: c.id,
      existingParkingIds,
    });
  }

  openEditParking(parking: ParkingDto): void {
    this.parkingsService.openParkingForm({
      parkingData: parking,
      cragId: this.crag()?.id,
    });
  }

  removeParking(parking: ParkingDto): void {
    const c = this.crag();
    if (!c || !isPlatformBrowser(this.platformId)) return;

    void firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('admin.parkings.unlinkTitle'),
        size: 's',
        data: {
          content: this.translate.instant('admin.parkings.unlinkConfirm', {
            name: parking.name,
          }),
          yes: this.translate.instant('unlink'),
          no: this.translate.instant('cancel'),
          appearance: 'accent',
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    ).then((confirmed) => {
      if (confirmed) {
        this.parkingsService
          .removeParkingFromCrag(c.id, parking.id)
          .catch((err) => handleErrorToast(err, this.toast));
      }
    });
  }

  async viewOnMap(lat: number, lng: number): Promise<void> {
    const area = this.global.selectedArea();
    let minLat = lat;
    let maxLat = lat;
    let minLng = lng;
    let maxLng = lng;

    if (area) {
      await this.supabase.whenReady();
      const { data } = await this.supabase.client
        .from('crags')
        .select('latitude, longitude')
        .eq('area_id', area.id)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (data) {
        data.forEach((c) => {
          if (c.latitude! < minLat) minLat = c.latitude!;
          if (c.latitude! > maxLat) maxLat = c.latitude!;
          if (c.longitude! < minLng) minLng = c.longitude!;
          if (c.longitude! > maxLng) maxLng = c.longitude!;
        });
      }
    }

    this.global.mapBounds.set({
      south_west_latitude: minLat,
      south_west_longitude: minLng,
      north_east_latitude: maxLat,
      north_east_longitude: maxLng,
    });
    void this.router.navigateByUrl('/explore');
  }

  protected openExternal(url: string): void {
    if (isPlatformBrowser(this.platformId)) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }
}
