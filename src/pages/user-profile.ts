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
import { AsyncPipe, isPlatformBrowser } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { TUI_COUNTRIES, TuiAvatar } from '@taiga-ui/kit';
import { TuiButton, TuiFallbackSrcPipe, TuiFlagPipe } from '@taiga-ui/core';
import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { SupabaseService } from '../services';
import { UserProfileDto } from '../models';

// Dialog content (editor)
import { UserProfileConfigComponent } from './user-profile-config';
import { TuiCountryIsoCode } from '@taiga-ui/i18n';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    TranslatePipe,
    TuiAvatar,
    TuiFallbackSrcPipe,
    TuiButton,
    TuiFallbackSrcPipe,
    AsyncPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="w-full max-w-3xl mx-auto p-4 grid gap-4">
      <div class="flex items-center gap-4">
        <tui-avatar
          [src]="profileAvatarSrc() | tuiFallbackSrc: '@tui.user' | async"
          size="xxl"
        />
        <div class="grow">
          <div class="flex flex-row items-center justify-between">
            @if (canEdit()) {
              <div class="text-xl font-semibold">
                {{ profile()?.name }}
              </div>
              <button
                iconStart="@tui.bolt"
                size="m"
                tuiIconButton
                type="button"
                appearance="action-grayscale"
                (click)="openEditDialog()"
              >
                {{ 'actions.edit' | translate }}
              </button>
            }
          </div>

          <div class="flex items-center gap-2">
            <span class="flex items-center gap-2">
              @let country = profileCountry();
              {{ (countriesNames$ | async)?.[country] }}
              @if (profile()?.city; as city) {
                , {{ city }}
              }
            </span>
          </div>
          <div class="opacity-70">{{ profile()?.bio }}</div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-2">
        @if (profileAge(); as age) {
          <div class="flex items-center gap-2">
            <span class="font-medium">{{ 'labels.age' | translate }}:</span>
            <span>{{ age }}</span>
          </div>
        }

        @if (profile()?.starting_climbing_year; as year) {
          <div class="flex items-center gap-2">
            <span class="font-medium"
              >{{ 'labels.startingClimbingYear' | translate }}:</span
            >
            <span>{{ year }}</span>
          </div>
        }
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
      })
      .subscribe();
  }
}

export default UserProfileComponent;
