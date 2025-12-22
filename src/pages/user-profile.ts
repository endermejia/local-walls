import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { AsyncPipe, isPlatformBrowser, LowerCasePipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { TUI_COUNTRIES, TuiAvatar, TuiSkeleton } from '@taiga-ui/kit';
import { TuiButton, TuiFallbackSrcPipe, TuiHint } from '@taiga-ui/core';
import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiCountryIsoCode } from '@taiga-ui/i18n';
import { SupabaseService } from '../services';
import { UserProfileDto } from '../models';
import { UserProfileConfigComponent } from './user-profile-config';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    TranslatePipe,
    TuiAvatar,
    TuiFallbackSrcPipe,
    TuiButton,
    TuiHint,
    TuiFallbackSrcPipe,
    AsyncPipe,
    TuiSkeleton,
    LowerCasePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="w-full max-w-3xl mx-auto p-4 grid gap-4">
      @let loading = !profile();
      <div class="flex items-center gap-4">
        @let avatar = profileAvatarSrc();
        <tui-avatar
          [src]="avatar | tuiFallbackSrc: '@tui.user' | async"
          [tuiSkeleton]="loading"
          size="xxl"
        />
        <div class="grow">
          <div class="flex flex-row items-center justify-between">
            @let name = profile()?.name;
            <div class="text-xl font-semibold">
              <span
                [tuiSkeleton]="loading ? 'name lastName secondLastName' : false"
              >
                {{ name }}
              </span>
            </div>
            @if (canEdit()) {
              <button
                iconStart="@tui.bolt"
                size="m"
                tuiIconButton
                type="button"
                appearance="action-grayscale"
                [tuiHint]="'actions.edit' | translate"
                (click)="openEditDialog()"
              >
                {{ 'actions.edit' | translate }}
              </button>
            }
          </div>

          <div class="flex items-center gap-x-2 flex-wrap">
            @let country = profileCountry();
            @let city = profile()?.city;
            <span
              class="flex items-center gap-2"
              [tuiSkeleton]="loading ? 'country, city' : false"
            >
              {{ (countriesNames$ | async)?.[country]
              }}{{ city ? ', ' + city : '' }}
            </span>
            @if (profileAge(); as age) {
              |
              <span>
                {{ age }}
                {{ 'labels.years' | translate | lowercase }}
              </span>
            }

            @if (profile()?.starting_climbing_year; as year) {
              <span class="opacity-70">
                (
                {{ 'labels.startingClimbingYear' | translate | lowercase }}
                {{ year }}
                )
              </span>
            }
          </div>
          <div class="opacity-70">
            @let bio = profile()?.bio;
            <span
              [tuiSkeleton]="
                loading
                  ? 'This text serves as the content behind the skeleton and adjusts the width.'
                  : false
              "
            >
              {{ bio }}
            </span>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class UserProfileComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);
  private readonly dialogs = inject(TuiDialogService);
  protected readonly countriesNames$ = inject(TUI_COUNTRIES);

  // Route param (optional)
  id = input<string | undefined>();

  // Loading state for external fetches
  readonly loading = signal<boolean>(true);

  // Currently viewed profile (own or by id)
  private readonly _profile = signal<UserProfileDto | null>(null);
  readonly profile = computed(() => this._profile());
  readonly profileCountry = computed(
    () => this.profile()?.country as TuiCountryIsoCode,
  );

  readonly isOwnProfile = computed(() => {
    const currentId = this.supabase.authUserId();
    const viewedId = this.profile()?.id ?? null;
    return !!currentId && !!viewedId && currentId === viewedId;
  });
  readonly canEdit = computed(() => this.isOwnProfile());

  readonly profileAvatarSrc = computed(() =>
    this.supabase.buildAvatarUrl(this.profile()?.avatar),
  );

  readonly profileAge = computed(() => {
    const bd = this.profile()?.birth_date as string | null | undefined;
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
    // React to parameter and logged-in profile changes
    effect(() => {
      const paramId = this.id();
      void this.loadProfile(paramId);
    });
  }

  private async loadProfile(paramId?: string): Promise<void> {
    // If no param, use current user's profile signal
    try {
      this.loading.set(true);
      if (!paramId) {
        const p = this.supabase.userProfile();
        this._profile.set(p ?? null);
        return;
      }
      // If param is the same as current user id, reuse
      const currentId = this.supabase.authUserId();
      if (currentId && paramId === currentId) {
        const p = this.supabase.userProfile();
        this._profile.set(p ?? null);
        return;
      }
      // Otherwise, fetch by id on client only
      if (isPlatformBrowser(this.platformId)) {
        const { data, error } = await this.supabase.client
          .from('user_profiles')
          .select('*')
          .eq('id', paramId)
          .maybeSingle();
        if (error) {
          console.error('[UserProfile] fetch by id error', error);
          this._profile.set(null);
        } else {
          this._profile.set(data ?? null);
        }
      } else {
        // On SSR, skip external fetch; render loading placeholder
        this._profile.set(null);
      }
    } finally {
      this.loading.set(false);
    }
  }

  openEditDialog(): void {
    if (!this.isOwnProfile()) return;
    this.dialogs
      .open(new PolymorpheusComponent(UserProfileConfigComponent), {
        appearance: 'fullscreen',
        closable: false,
      })
      .subscribe();
  }
}

export default UserProfileComponent;
