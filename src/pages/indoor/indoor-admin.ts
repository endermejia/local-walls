import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { TuiButton, TuiLoader, TuiScrollbar } from '@taiga-ui/core';
import { TuiTabs } from '@taiga-ui/kit';

import { GlobalData } from '../../services/global-data';
import { IndoorService } from '../../services/indoor.service';
import { SupabaseService } from '../../services/supabase.service';
import { SectionHeaderComponent } from '../../components/ui/section-header';
import { IndoorAccountingComponent } from '../../components/indoor/indoor-accounting';
import { IndoorInventoryComponent } from '../../components/indoor/indoor-inventory';
import { IndoorAdminInfoComponent } from '../../components/indoor/indoor-admin-info';

@Component({
  selector: 'app-indoor-admin',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    TuiButton,
    TuiLoader,
    TuiScrollbar,
    TuiTabs,
    RouterLink,
    SectionHeaderComponent,
    IndoorAccountingComponent,
    IndoorInventoryComponent,
    IndoorAdminInfoComponent,
  ],
  template: `
    <tui-scrollbar class="flex grow">
      <section class="w-full max-w-5xl mx-auto p-4 flex flex-col min-h-full">
        @if (centerResource.value(); as c) {
          <div class="mb-6">
            <app-section-header
              [title]="c.name + ' - ' + ('admin.title' | translate)"
              [liked]="false"
            >
              <div actionButtons>
                <a
                  tuiButton
                  size="s"
                  appearance="flat"
                  [routerLink]="['/indoor', c.slug]"
                >
                  {{ 'back' | translate }}
                </a>
              </div>
            </app-section-header>
          </div>

          <tui-tabs [(activeItemIndex)]="activeTabIndex">
            <button tuiTab>{{ 'details' | translate }}</button>
            <button tuiTab>{{ 'indoor.vouchers' | translate }}</button>
            <button tuiTab>{{ 'indoor.accounting' | translate }}</button>
            <button tuiTab>{{ 'indoor.inventory' | translate }}</button>
          </tui-tabs>

          <div class="mt-6">
            @switch (activeTabIndex()) {
              @case (0) {
                <app-indoor-admin-info [center]="c" />
              }
              @case (1) {
                <!-- Manage Vouchers Component -->
                <div class="p-10 text-center opacity-50">
                  Manage Vouchers (WIP)
                </div>
              }
              @case (2) {
                <app-indoor-accounting [centerId]="c.id" />
              }
              @case (3) {
                <app-indoor-inventory [centerId]="c.id" />
              }
            }
          </div>
        } @else if (centerResource.isLoading()) {
          <tui-loader size="xxl" class="mt-20" />
        }
      </section>
    </tui-scrollbar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow min-h-0' },
})
export class IndoorAdminComponent {
  slug = input.required<string>();

  protected readonly global = inject(GlobalData);
  protected readonly indoor = inject(IndoorService);
  protected readonly supabase = inject(SupabaseService);

  protected readonly activeTabIndex = signal(0);

  protected readonly centerResource = resource({
    params: () => this.slug(),
    loader: ({ params: slug }) => this.indoor.getCenterBySlug(slug),
  });
}
