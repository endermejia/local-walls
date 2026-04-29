import { LowerCasePipe } from '@angular/common';
import { TuiCountryIsoCode } from '@taiga-ui/i18n';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { TuiAvatar, TUI_COUNTRIES, TuiSkeleton } from '@taiga-ui/kit';
import { TuiButton, TuiIcon, TuiLink, TuiScrollbar } from '@taiga-ui/core';
import { TranslatePipe } from '@ngx-translate/core';

import { GlobalData } from '../../services/global-data';
import { SupabaseService } from '../../services/supabase.service';

import { RoutesTableComponent } from '../../components/route/routes-table';

import { AvatarUrlPipe } from '../../pipes/avatar-url.pipe';

@Component({
  selector: 'app-equipper',
  standalone: true,
  imports: [
    AvatarUrlPipe,
    LowerCasePipe,
    RouterLink,
    RoutesTableComponent,
    TranslatePipe,
    TuiAvatar,
    TuiButton,
    TuiIcon,
    TuiLink,
    TuiScrollbar,
    TuiSkeleton,
  ],
  template: `
    <tui-scrollbar class="flex grow">
      <section class="w-full max-w-5xl mx-auto p-4 grid gap-4">
        @let equipper = global.equipperDetailResource.value();
        @let profile = equipper?.user_profile;
        @let loading = global.equipperDetailResource.isLoading();

        <div class="flex items-center gap-4">
          <span tuiAvatar [tuiSkeleton]="loading" size="xxl">
            @let photo = profile?.avatar;
            @if (photo) {
              <img [src]="photo | avatarUrl" [alt]="equipper?.name || ''" />
            } @else {
              <tui-icon icon="@tui.hammer" />
            }
          </span>

          <div class="grow">
            <div class="flex flex-row gap-2 items-center">
              <h1 class="text-2xl font-semibold" [tuiSkeleton]="loading">
                @if (profile?.id; as id) {
                  <a
                    tuiLink
                    [routerLink]="['/profile', id]"
                    class="text-inherit!"
                  >
                    {{ equipper?.name }}
                  </a>
                } @else {
                  {{ equipper?.name }}
                }
              </h1>

              @if (profile?.id; as id) {
                <button
                  tuiButton
                  type="button"
                  size="s"
                  appearance="flat"
                  [routerLink]="['/profile', id]"
                >
                  {{ 'nav.profile' | translate }}
                </button>
              }
            </div>

            <div class="flex items-center gap-x-2 flex-wrap">
              @let city = profile?.city;
              @if (profileCountry(); as country) {
                <span
                  class="flex items-center gap-2"
                  [tuiSkeleton]="loading ? 'country, city' : false"
                >
                  {{ countriesNames()[country] }}{{ city ? ', ' + city : '' }}
                </span>
              } @else if (city) {
                <span
                  class="flex items-center gap-2"
                  [tuiSkeleton]="loading ? 'country, city' : false"
                >
                  {{ city }}
                </span>
              }
              @if (profileAge(); as age) {
                |
                <span>
                  {{ age }}
                  {{ 'years' | translate | lowercase }}
                </span>
              }
              @if (profile?.starting_climbing_year; as since) {
                |
                <span [tuiSkeleton]="loading">
                  {{ 'startingClimbingYear' | translate }} {{ since }}
                </span>
              }
            </div>

            <div class="mt-2 opacity-80" [tuiSkeleton]="loading">
              {{ equipper?.description || profile?.bio }}
            </div>
          </div>
        </div>

        <div class="mt-4">
          <h2 class="text-xl font-semibold mb-2" [tuiSkeleton]="loading">
            {{ 'routes' | translate }}
          </h2>

          <app-routes-table
            [data]="global.equipperRoutesResource.value() || []"
            [showLocation]="true"
          />
        </div>
      </section>
    </tui-scrollbar>
  `,
  host: { class: 'flex grow min-h-0' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipperComponent {
  protected readonly global = inject(GlobalData);
  protected readonly supabase = inject(SupabaseService);
  protected readonly router = inject(Router);

  // Route param
  id = input.required<string>();

  protected readonly countriesNames = inject(TUI_COUNTRIES);

  readonly profileCountry = computed(
    () =>
      this.global.equipperDetailResource.value()?.user_profile
        ?.country as TuiCountryIsoCode,
  );

  readonly profileAge = computed(() => {
    const bd =
      this.global.equipperDetailResource.value()?.user_profile?.birth_date;
    if (!bd) return null;
    const d = new Date(bd);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    let years = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years--;
    return years;
  });

  constructor() {
    effect(() => {
      const idStr = this.id();
      if (idStr) {
        untracked(() => this.global.resetDataByPage('equipper'));
        this.global.selectedEquipperId.set(parseInt(idStr, 10));
      }
    });

    effect(() => {
      this.global.isNavLoading.set(
        this.global.equipperDetailResource.isLoading(),
      );
    });
  }
}
