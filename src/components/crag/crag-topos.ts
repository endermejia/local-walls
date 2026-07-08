import { LowerCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';

import { TuiAvatar } from '@taiga-ui/kit';
import { TuiButton, TuiIcon } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

import { GlobalData } from '../../services/global-data';
import { ToposService } from '../../services/topos.service';

import { EmptyStateComponent } from '../ui/empty-state';
import { PaywallComponent } from '../paywall/paywall';
import { TopoCardComponent } from '../topo/topo-card';

import { IconSrcPipe } from '../../pipes/icon-src.pipe';
import { CragDetail } from '../../models';

@Component({
  selector: 'app-crag-topos',
  imports: [
    EmptyStateComponent,
    IconSrcPipe,
    LowerCasePipe,
    PaywallComponent,
    TopoCardComponent,
    TranslatePipe,
    TuiAvatar,
    TuiButton,
    TuiIcon,
  ],
  template: `
    @let toposCount = topos().length;
    <div class="flex items-center justify-between gap-2 mb-4">
      <div class="flex items-center gap-2">
        <span
          [tuiAvatar]="'topo' | iconSrc"
          tuiThumbnail
          size="l"
          class="self-center"
          [attr.aria-label]="'topo' | translate"
        ></span>
        <h2 class="text-2xl font-semibold">
          {{ toposCount }}
          {{ (toposCount === 1 ? 'topo' : 'topos') | translate | lowercase }}
        </h2>
      </div>
      @if (canAreaAdmin()) {
        <button
          tuiButton
          appearance="textfield"
          size="s"
          type="button"
          (click.zoneless)="openCreateTopo()"
          [iconStart]="'@tui.plus'"
        >
          {{ 'new' | translate }}
        </button>
      }
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      @if (
        crag()?.is_public ||
        crag()?.purchased ||
        canEditAsAdmin() ||
        canAreaAdmin()
      ) {
        @for (t of topos(); track t.id) {
          <app-topo-card
            [topo]="t"
            (selected)="
              router.navigate(['/area', areaSlug(), cragSlug(), 'topo', t.id])
            "
          />
        } @empty {
          <div class="col-span-full">
            <app-empty-state icon="@tui.image" />
          </div>
        }
      } @else {
        @let isSecret =
          !crag()?.is_public && (crag()?.price === null || crag()?.price === 0);
        @if (!isSecret) {
          <div class="col-span-full">
            <app-paywall
              [areaId]="crag()?.area_id || 0"
              [price]="crag()?.price || 0"
            />
          </div>
        } @else {
          <div
            class="col-span-full flex flex-col items-center justify-center p-8 text-center gap-2"
          >
            <tui-icon icon="@tui.lock" class="text-4xl opacity-50" />
            <p class="text-sm font-semibold opacity-70">
              {{ 'topos.restricted' | translate }}
            </p>
            <p class="text-xs opacity-50">
              {{ 'topos.restrictedMessage' | translate }}
            </p>
          </div>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CragToposComponent {
  crag = input.required<CragDetail | null>();
  areaSlug = input.required<string>();
  cragSlug = input.required<string>();

  protected readonly global = inject(GlobalData);
  protected readonly toposService = inject(ToposService);
  protected readonly router = inject(Router);

  readonly canEditAsAdmin = this.global.canEditAsAdmin;
  readonly canAreaAdmin = computed(() => {
    const c = this.crag();
    if (!c) return false;
    return this.global.areaAdminPermissions()[c.area_id];
  });

  protected readonly topos = computed(() => {
    const c = this.crag();
    if (!c) return [];
    return c.topos;
  });

  openCreateTopo(): void {
    const c = this.crag();
    if (!c) return;
    this.toposService.openTopoForm({ cragId: c.id });
  }
}
