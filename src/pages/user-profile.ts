import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  inject,
  signal,
  WritableSignal,
} from '@angular/core';
import { isPlatformBrowser, Location, AsyncPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiLoader, TuiButton, TuiTextfield } from '@taiga-ui/core';
import {
  TuiChevron,
  TuiDataListWrapper,
  TuiSelect,
  TuiFiles,
  type TuiFileLike,
  TuiInputInline,
} from '@taiga-ui/kit';
import { GlobalData, UserProfilesService, SupabaseService } from '../services';
import { TuiAutoFocus } from '@taiga-ui/cdk';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    AsyncPipe,
    TranslatePipe,
    TuiLoader,
    TuiButton,
    FormsModule,
    ReactiveFormsModule,
    TuiChevron,
    TuiDataListWrapper,
    TuiSelect,
    TuiTextfield,
    TuiFiles,
    TuiInputInline,
    TuiAutoFocus,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="w-full max-w-3xl mx-auto p-4">
      @if (loading()) {
        <div class="flex justify-center my-8">
          <tui-loader size="l" />
        </div>
      } @else {
        @if (loaded()) {
          <form class="grid grid-cols-1 gap-4" (submit.zoneless)="save()">
            @if (editingName()) {
              <tui-input-inline>
                <input
                  tuiTextfield
                  tuiAutoFocus
                  class="tui-space_bottom-1 w-full"
                  type="text"
                  [(ngModel)]="name"
                  name="name"
                  autocomplete="name"
                  (blur.zoneless)="toggleEditing(false)"
                  (keydown.enter)="toggleEditing(false)"
                />
              </tui-input-inline>
            } @else {
              <div class="flex items-center gap-2">
                <span>{{ name || '-' }}</span>
                @if (canEdit()) {
                  <button
                    appearance="icon"
                    iconStart="@tui.pencil"
                    size="xs"
                    tuiIconButton
                    type="button"
                    class="tui-space_left-1"
                    (click.zoneless)="toggleEditing(true)"
                  >
                    {{ 'common.edit' | translate }}
                  </button>
                }
              </div>
            }

            <div>
              @if (!avatarControl.value) {
                <label tuiInputFiles>
                  <input
                    accept="image/*"
                    capture="user"
                    title="Choose files (no limits)"
                    tuiInputFiles
                    [formControl]="avatarControl"
                  />
                </label>
              }
              <tui-files class="tui-space_top-1">
                @if (avatarControl.valueChanges | async; as file) {
                  <tui-file [file]="file" (remove)="removeAvatar()" />
                }
              </tui-files>
            </div>

            <tui-textfield [style.margin-block-end.rem]="1">
              <label class="block text-sm opacity-80 mb-1">
                {{ 'profile.bio' | translate }}
              </label>
              <textarea
                class="w-full"
                rows="4"
                [(ngModel)]="bio"
                name="bio"
              ></textarea>
            </tui-textfield>

            <div>
              <span>
                {{ 'labels.email' | translate }}
              </span>
              <div class="px-3 py-2 rounded bg-[var(--tui-base-03)] opacity-80">
                {{ email() || ('labels.anonymous' | translate) }}
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <tui-textfield tuiChevron class="w-full">
                  <label class="block text-sm opacity-80 mb-1">
                    {{ 'profile.language' | translate }}
                  </label>
                  <input tuiSelect [(ngModel)]="language" name="language" />
                  <tui-data-list-wrapper
                    *tuiTextfieldDropdown
                    [items]="languages"
                  />
                </tui-textfield>
              </div>

              <div>
                <tui-textfield tuiChevron class="w-full">
                  <label tuiLabel for="theme">
                    {{ 'profile.theme' | translate }}
                  </label>
                  <input id="theme" tuiSelect [(ngModel)]="theme" />
                  <tui-data-list-wrapper
                    *tuiTextfieldDropdown
                    [items]="themes"
                  />
                </tui-textfield>
              </div>
            </div>

            <div>
              <label class="block text-sm opacity-80 mb-1">
                {{ 'profile.role' | translate }}
              </label>
              <div class="px-3 py-2 rounded bg-[var(--tui-base-03)]">
                {{ role ?? '-' }}
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                tuiButton
                type="button"
                (click.zoneless)="changePassword()"
              >
                {{ 'auth.forgotPassword' | translate }}
              </button>
              <button tuiButton type="button" (click.zoneless)="logout()">
                {{ 'auth.logout' | translate }}
              </button>
            </div>

            <div class="mt-4 flex gap-2 justify-end">
              <button tuiButton appearance="primary" type="submit">
                {{ 'common.save' | translate }}
              </button>
            </div>
          </form>
        } @else {
          <p class="opacity-80">{{ 'errors.unexpected' | translate }}</p>
        }
      }

      @if (error()) {
        <p class="text-red-600 mt-4">{{ error() }}</p>
      }
    </section>
  `,
})
export class UserProfileComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly userProfiles = inject(UserProfilesService);
  private readonly location = inject(Location);
  private readonly global = inject(GlobalData);
  private readonly supabase = inject(SupabaseService);

  readonly loading = signal(true);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);
  readonly loaded = signal(false);
  readonly editingName = signal(false);

  // Auth/session
  readonly email = signal<string | null>(null);
  readonly canEdit = signal(false);

  // Form model
  name: string | null = null;
  avatar: string | null = null;
  bio: string | null = null;
  language: 'es' | 'en' = 'es';
  theme: 'light' | 'dark' = 'light';
  role: string | null = null;

  // Select items
  readonly languages: ('en' | 'es')[] = ['es', 'en'];
  readonly themes: ('light' | 'dark')[] = ['light', 'dark'];

  // Avatar control (Taiga UI Files)
  protected readonly avatarControl = new FormControl<TuiFileLike | null>(null);

  constructor() {
    void this.load();
  }

  private async load() {
    if (!isPlatformBrowser(this.platformId)) {
      this.loading.set(false);
      return;
    }
    this.error.set(null);
    this.loading.set(true);
    await this.supabase.whenReady();
    const session = await this.supabase.getSession();
    const user = session?.user ?? null;
    this.email.set(user?.email ?? null);
    this.canEdit.set(!!user);
    const profile = await this.userProfiles.getCurrent();
    this.name = profile?.name ?? null;
    this.avatar = profile?.avatar ?? null;
    this.bio = profile?.bio ?? null;
    this.language =
      (profile?.language as 'es' | 'en') ?? this.global.selectedLanguage();
    this.theme =
      (profile?.theme as 'light' | 'dark') ?? this.global.selectedTheme();
    this.role = profile?.role ?? null;
    this.loaded.set(true);
    this.loading.set(false);
  }

  goBack() {
    this.location.back();
  }

  toggleEditing(v?: boolean) {
    const next = typeof v === 'boolean' ? v : !this.editingName();
    if (!this.canEdit()) return;
    this.editingName.set(next);
  }

  protected removeAvatar(): void {
    this.avatarControl.setValue(null);
  }

  async changePassword() {
    if (!isPlatformBrowser(this.platformId)) return;
    const email = this.email();
    if (!email) return;
    try {
      await this.supabase.resetPassword(email);
      this.error.set(null);
    } catch (e: any) {
      this.error.set(e?.message ?? 'errors.unexpected');
    }
  }

  async logout() {
    if (!isPlatformBrowser(this.platformId)) return;
    await this.supabase.logout();
  }

  async save() {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      this.loading.set(true);
      const saved = await this.userProfiles.upsertCurrent({
        name: this.name ?? '',
        avatar: this.avatar ?? null,
        bio: this.bio ?? null,
        language: this.language ?? this.global.selectedLanguage(),
        theme: this.theme ?? this.global.selectedTheme(),
      });
      if (saved?.language === 'es' || saved?.language === 'en') {
        this.global.selectedLanguage.set(saved.language as 'es' | 'en');
      }
      if (saved?.theme === 'light' || saved?.theme === 'dark') {
        this.global.selectedTheme.set(saved.theme as 'light' | 'dark');
      }
      this.name = saved?.name ?? this.name;
      this.avatar = saved?.avatar ?? this.avatar;
      this.bio = saved?.bio ?? this.bio;
      this.role = saved?.role ?? this.role;
      this.error.set(null);
    } catch (e: any) {
      this.error.set(e?.message ?? 'profile.saveError');
    } finally {
      this.loading.set(false);
    }
  }
}
