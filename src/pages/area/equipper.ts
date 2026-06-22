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
import { LowerCasePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { TuiLink, TuiScrollbar } from '@taiga-ui/core';
import { TUI_COUNTRIES, TuiSkeleton } from '@taiga-ui/kit';
import { TranslatePipe } from '@ngx-translate/core';

import { GlobalData } from '../../services/global-data';
import { SupabaseService } from '../../services/supabase.service';

import { RoutesTableComponent } from '../../components/route/routes-table';

import { UserInfoComponent } from '../../components/ui/user-info';

@Component({
  selector: 'app-equipper',
  standalone: true,
  imports: [
    LowerCasePipe,
    RouterLink,
    RoutesTableComponent,
    TranslatePipe,
    TuiLink,
    TuiScrollbar,
    TuiSkeleton,
    UserInfoComponent,
  ],
  template: `
    <tui-scrollbar class="flex grow">
      <section class="w-full max-w-5xl mx-auto p-4 grid gap-4">
        @let equipper = global.equipperDetailResource.value();
        @let profile = equipper?.user_profile;
        @let loading = global.equipperDetailResource.isLoading();

        <app-user-info
          [loading]="loading"
          [avatar]="profile?.avatar"
          [name]="equipper?.name"
          [city]="profile?.city"
          [country]="profileCountry()"
          [age]="profileAge()"
          [startingClimbingYear]="profile?.starting_climbing_year"
          [bio]="equipper?.description || profile?.bio"
          defaultIcon="@tui.hammer"
        >
          <div class="flex flex-wrap gap-4 mt-2" extraInfo>
            @if (profile?.id; as id) {
              <a
                tuiLink
                [tuiSkeleton]="loading"
                [routerLink]="['/profile', id]"
              >
                {{ 'nav.viewProfile' | translate }}
              </a>
            }
          </div>
        </app-user-info>

        <div class="mt-4">
          <h2 class="text-xl font-semibold mb-2" [tuiSkeleton]="loading">
            {{ global.equipperRoutesResource.value()?.length || 0 }}
            {{ 'routes' | translate | lowercase }}
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
