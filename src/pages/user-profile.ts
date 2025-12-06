import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import {
  isPlatformBrowser,
  Location,
  AsyncPipe,
  JsonPipe,
} from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiButton, TuiTextfield } from '@taiga-ui/core';
import {
  TuiChevron,
  TuiDataListWrapper,
  TuiSelect,
  TuiFiles,
  type TuiFileLike,
  TuiInputInline,
} from '@taiga-ui/kit';
import { TuiAutoFocus } from '@taiga-ui/cdk';
import { SupabaseService } from '../services';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    AsyncPipe,
    TranslatePipe,
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
    JsonPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="w-full max-w-3xl mx-auto p-4">
      <form class="grid grid-cols-1 gap-4" (submit.zoneless)="save()">
        <pre>{{ supabase.userProfile() | json }}</pre>
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
              <tui-data-list-wrapper *tuiTextfieldDropdown [items]="themes" />
            </tui-textfield>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
    </section>
  `,
})
export class UserProfileComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly location = inject(Location);
  protected readonly supabase = inject(SupabaseService);

  readonly editingName = signal(this.supabase.userProfile()?.name);

  // Auth/session
  readonly email = signal<string | null>(null);
  readonly canEdit = signal(false);

  // Form model
  name: string | null = this.supabase.userProfile()?.name ?? null;
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

  goBack() {
    this.location.back();
  }

  protected removeAvatar(): void {
    this.avatarControl.setValue(null);
  }

  async logout() {
    if (!isPlatformBrowser(this.platformId)) return;
    await this.supabase.logout();
  }

  async save() {
    if (!isPlatformBrowser(this.platformId)) return;
    // TODO
  }
}
