import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  resource,
  signal,
  computed,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import {
  TuiAppearance,
  TuiButton,
  TuiCarousel,
  TuiIcon,
  TuiLoader,
  TuiScrollbar,
} from '@taiga-ui/core';
import { TuiAvatar, TuiTabs } from '@taiga-ui/kit';
import { TuiPagination } from '@taiga-ui/kit';

import { GlobalData } from '../../services/global-data';
import { IndoorService } from '../../services/indoor.service';
import { SupabaseService } from '../../services/supabase.service';
import { IndoorCenterDto } from '../../models';
import { SectionHeaderComponent } from '../../components/ui/section-header';
import { IndoorVouchersComponent } from '../../components/indoor/indoor-vouchers';
import { IndoorRoutesComponent } from '../../components/indoor/indoor-routes';
import { IndoorToposComponent } from '../../components/indoor/indoor-topos';
import { AnyToSchedulePipe } from '../../pipes/any-to-schedule.pipe';

@Component({
  selector: 'app-indoor-center',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    TuiAppearance,
    TuiAvatar,
    TuiButton,
    TuiIcon,
    TuiLoader,
    TuiScrollbar,
    TuiTabs,
    TuiCarousel,
    TuiPagination,
    RouterLink,
    SectionHeaderComponent,
    IndoorVouchersComponent,
    IndoorRoutesComponent,
    IndoorToposComponent,
    AnyToSchedulePipe,
  ],
  template: `
    <tui-scrollbar class="flex grow">
      <section class="w-full max-w-5xl mx-auto p-4 flex flex-col min-h-full">
        @if (center(); as c) {
          <div class="mb-6">
            <app-section-header [title]="c.name" [liked]="false">
              @if (isAdmin()) {
                <div actionButtons class="flex gap-2">
                  <a
                    tuiButton
                    size="s"
                    appearance="neutral"
                    iconStart="@tui.settings"
                    class="rounded-full!"
                    [routerLink]="['/indoor', c.slug, 'admin']"
                  >
                    {{ 'admin.title' | translate }}
                  </a>
                </div>
              }
            </app-section-header>
          </div>

          <div class="flex flex-col md:flex-row gap-6">
            <div class="flex flex-col gap-4 grow">
              <!-- Gallery/Avatar -->
              <div
                class="relative rounded-3xl overflow-hidden aspect-video bg-neutral-100 dark:bg-neutral-800"
              >
                @if (c.gallery_urls && c.gallery_urls.length > 0) {
                  <tui-carousel [(index)]="galleryIndex" class="h-full w-full">
                    @for (img of c.gallery_urls; track img) {
                      <ng-container *tuiItem>
                        <img
                          [src]="supabase.getPublicUrl('indoor-assets', img)"
                          class="w-full h-full object-cover"
                          alt="Gallery image"
                        />
                      </ng-container>
                    }
                  </tui-carousel>
                  <tui-pagination
                    size="m"
                    class="absolute bottom-4 left-1/2 -translate-x-1/2"
                    [length]="c.gallery_urls.length"
                    [(index)]="galleryIndex"
                  ></tui-pagination>
                } @else {
                  <div class="flex items-center justify-center h-full">
                    <span
                      [tuiAvatar]="
                        supabase.getPublicUrl('indoor-centers', c.avatar_url)
                      "
                      size="xxl"
                      class="rounded-3xl"
                    ></span>
                  </div>
                }
              </div>

              <div class="flex flex-col gap-2">
                <p class="text-lg">{{ c.description }}</p>
                <div
                  class="flex items-center gap-2 text-(--tui-text-secondary)"
                >
                  <tui-icon icon="@tui.map-pin" />
                  <span
                    >{{ c.city }}{{ c.country ? ', ' + c.country : '' }}</span
                  >
                </div>
              </div>
            </div>

            <!-- Sidebar: Schedule & Vouchers -->
            <div class="flex flex-col gap-6 md:w-80 shrink-0">
              <div
                tuiAppearance="flat-grayscale"
                class="p-4 rounded-3xl flex flex-col gap-4"
              >
                <h3 class="font-bold flex items-center gap-2">
                  <tui-icon icon="@tui.clock" />
                  {{ 'indoor.schedule' | translate }}
                </h3>

                @let schedule = c.schedule | anyToSchedule;
                <div class="flex flex-col gap-1 text-sm">
                  @for (
                    day of [
                      'monday',
                      'tuesday',
                      'wednesday',
                      'thursday',
                      'friday',
                      'saturday',
                      'sunday',
                    ];
                    track day
                  ) {
                    <div class="flex justify-between">
                      <span class="capitalize">{{ day | translate }}</span>
                      @let s = schedule.normal[day];
                      <span>{{
                        s?.closed
                          ? ('indoor.closed' | translate)
                          : s?.open + ' - ' + s?.close
                      }}</span>
                    </div>
                  }
                </div>
              </div>

              <div
                tuiAppearance="flat-grayscale"
                class="p-4 rounded-3xl flex flex-col gap-4"
              >
                <app-indoor-vouchers [centerId]="c.id" />
              </div>
            </div>
          </div>

          <tui-tabs [(activeItemIndex)]="activeTabIndex" class="mt-8">
            <button tuiTab>{{ 'indoor.routes' | translate }}</button>
            <button tuiTab>{{ 'indoor.topos' | translate }}</button>
            <button tuiTab>{{ 'indoor.ascents' | translate }}</button>
          </tui-tabs>

          <div class="mt-6">
            @switch (activeTabIndex()) {
              @case (0) {
                <app-indoor-routes [centerId]="c.id" />
              }
              @case (1) {
                <app-indoor-topos [centerId]="c.id" />
              }
              @case (2) {
                <div class="p-10 text-center opacity-50">
                  {{ 'indoor.ascents' | translate }} (WIP)
                </div>
              }
            }
          </div>
        } @else if (centerResource.isLoading()) {
          <div class="flex items-center justify-center w-full min-h-[50vh]">
            <tui-loader size="xxl" />
          </div>
        } @else {
          <div class="text-center p-20">
            <h2 class="text-2xl font-bold">
              {{ 'notFound.title' | translate }}
            </h2>
            <a tuiButton appearance="flat" class="mt-4" routerLink="/home">{{
              'notFound.goHome' | translate
            }}</a>
          </div>
        }
      </section>
    </tui-scrollbar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow min-h-0' },
})
export class IndoorCenterComponent {
  slug = input.required<string>();

  protected readonly global = inject(GlobalData);
  protected readonly indoor = inject(IndoorService);
  protected readonly supabase = inject(SupabaseService);
  protected readonly router = inject(Router);

  protected readonly activeTabIndex = signal(0);
  protected readonly galleryIndex = signal(0);

  protected readonly center = computed<IndoorCenterDto | null>(
    () => this.centerResource.value() ?? null,
  );

  protected readonly centerResource = resource<IndoorCenterDto | null, string>({
    params: () => this.slug(),
    loader: ({ params: slug }) => this.indoor.getCenterBySlug(slug),
  });

  protected readonly isAdmin = computed(() => {
    const user = this.global.userProfile();
    // Simplified: in reality check indoor_center_admins
    return user?.is_admin || false;
  });
}
