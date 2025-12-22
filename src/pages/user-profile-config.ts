import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  inject,
  computed,
  effect,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AsyncPipe, isPlatformBrowser } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  TuiButton,
  tuiDateFormatProvider,
  TuiFallbackSrcPipe,
  TuiFlagPipe,
  TuiIcon,
  TuiTextfield,
} from '@taiga-ui/core';
import {
  TuiChevron,
  TuiSelect,
  TuiDataListWrapper,
  TuiTextarea,
  TUI_COUNTRIES,
  TuiComboBox,
  TuiFilterByInputPipe,
  TuiInputNumber,
  TuiInputDate,
  TuiInputYear,
  TuiSwitch,
  TuiAvatar,
  TuiToastService,
  TuiToastOptions,
  TuiShimmer,
  TuiBadgedContentComponent,
  TuiBadge,
} from '@taiga-ui/kit';
import { TuiStringMatcher, TuiDay } from '@taiga-ui/cdk';
import { map } from 'rxjs';
import { GlobalData, SupabaseService, UserProfilesService } from '../services';
import {
  Language,
  Languages,
  Sex,
  Sexes,
  Theme,
  Themes,
  UserProfileDto,
} from '../models';
import {
  TuiDialogService,
  type TuiDialogContext,
} from '@taiga-ui/experimental';
import { PolymorpheusComponent, injectContext } from '@taiga-ui/polymorpheus';
import {
  AvatarCropperComponent,
  type AvatarCropperResult,
} from '../components/avatar-cropper';

interface Country {
  id: string;
  name: string;
}

@Component({
  selector: 'app-user-profile-config',
  standalone: true,
  imports: [
    TranslatePipe,
    TuiButton,
    FormsModule,
    ReactiveFormsModule,
    TuiChevron,
    TuiSelect,
    TuiTextfield,
    TuiDataListWrapper,
    TuiTextarea,
    TuiComboBox,
    TuiFilterByInputPipe,
    TuiFlagPipe,
    TuiInputNumber,
    TuiInputDate,
    TuiInputYear,
    TuiSwitch,
    TuiFallbackSrcPipe,
    TuiAvatar,
    AsyncPipe,
    TuiShimmer,
    TuiBadgedContentComponent,
    TuiBadge,
    TuiIcon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [tuiDateFormatProvider({ mode: 'DMY', separator: '/' })],
  template: `
    <section
      class="w-full max-w-5xl mx-auto p-4 grid grid-cols-1 gap-4"
      xmlns="http://www.w3.org/1999/html"
    >
      <!-- Sticky Header -->
      <div
        class="sticky top-0 z-10 flex items-center gap-4 bg-white dark:bg-[#333] p-2 -mx-2 mb-4"
      >
        <button
          size="s"
          appearance="neutral"
          iconStart="@tui.chevron-left"
          tuiIconButton
          type="button"
          class="!rounded-full"
          (click)="close()"
        >
          {{ 'actions.back' | translate }}
        </button>
        <h2 class="text-xl font-bold m-0">
          {{ 'profile.title' | translate }}
        </h2>
      </div>

      <!-- Avatar y Nombre -->
      <div class="flex flex-col md:flex-row items-center gap-4">
        <div class="relative inline-block">
          <tui-badged-content [style.--tui-radius.%]="50">
            <tui-icon icon="@tui.upload" tuiSlot="top" tuiBadge />
            <tui-avatar
              (mouseenter)="avatarHovered.set(true)"
              (mouseleave)="avatarHovered.set(false)"
              (click)="!isUploadingAvatar() && uploadAvatar()"
              class="cursor-pointer"
              size="xxl"
              [src]="avatarSrc() | tuiFallbackSrc: '@tui.user' | async"
              [tuiShimmer]="isUploadingAvatar()"
            />
          </tui-badged-content>
        </div>
        <div class="w-full">
          <tui-textfield class="w-full" [tuiTextfieldCleaner]="false">
            <label tuiLabel for="nameInput">{{
              'labels.userName' | translate
            }}</label>
            <input
              id="nameInput"
              tuiTextfield
              type="text"
              autocomplete="off"
              required
              minlength="3"
              maxlength="50"
              [(ngModel)]="displayName"
              (blur)="saveName()"
              (keydown.enter)="saveName()"
            />
          </tui-textfield>
        </div>
      </div>
      <!-- Bio -->
      <div>
        <tui-textfield class="w-full" [tuiTextfieldCleaner]="false">
          <label tuiLabel for="bioInput">{{ 'labels.bio' | translate }}</label>
          <textarea
            id="bioInput"
            tuiTextarea
            rows="4"
            maxlength="500"
            [(ngModel)]="bio"
            (blur)="saveBio()"
          ></textarea>
        </tui-textfield>
      </div>
      <!-- Country & City -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Country -->
        <div>
          <tui-textfield
            tuiChevron
            [tuiTextfieldCleaner]="false"
            [stringify]="stringifyCountryId"
          >
            <label tuiLabel for="countrySelect">{{
              'labels.country' | translate
            }}</label>
            <input
              id="countrySelect"
              tuiComboBox
              autocomplete="off"
              [(ngModel)]="country"
              [matcher]="matcher"
              [strict]="true"
              (ngModelChange)="saveCountry()"
            />
            <tui-data-list-wrapper
              *tuiTextfieldDropdown
              new
              [items]="countryIds() | tuiFilterByInput"
              [itemContent]="countryItem"
            />
            <ng-template #countryItem let-item>
              <img
                [src]="item | tuiFlag"
                alt="{{ idToName(item) }}"
                width="20"
                height="15"
                [style.margin-right.px]="8"
                [style.vertical-align]="'middle'"
              />
              {{ idToName(item) }}
            </ng-template>
          </tui-textfield>
        </div>
        <!-- City -->
        <div>
          <tui-textfield class="w-full" [tuiTextfieldCleaner]="false">
            <label tuiLabel for="cityInput">{{
              'labels.city' | translate
            }}</label>
            <input
              id="cityInput"
              tuiTextfield
              type="text"
              autocomplete="off"
              maxlength="100"
              [(ngModel)]="city"
              (blur)="saveCity()"
              (keydown.enter)="saveCity()"
            />
          </tui-textfield>
        </div>
      </div>
      <!-- Birth Date & Starting Climbing Year -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Birth Date -->
        <div>
          <tui-textfield class="w-full" [tuiTextfieldCleaner]="false">
            <label tuiLabel for="birthDateInput">{{
              'labels.birthDate' | translate
            }}</label>
            <input
              id="birthDateInput"
              tuiInputDate
              [max]="today"
              [min]="minBirthDate"
              [(ngModel)]="birthDate"
              (ngModelChange)="saveBirthDate()"
            />
            <tui-calendar *tuiTextfieldDropdown />
          </tui-textfield>
        </div>
        <!-- Starting Climbing Year -->
        <div>
          <tui-textfield class="w-full" [tuiTextfieldCleaner]="false">
            <label tuiLabel for="startingClimbingYearInput">{{
              'labels.startingClimbingYear' | translate
            }}</label>
            <input
              id="startingClimbingYearInput"
              tuiInputYear
              [min]="minYear"
              [max]="currentYear"
              [(ngModel)]="startingClimbingYear"
              (ngModelChange)="saveStartingClimbingYear()"
            />
            <tui-calendar-year *tuiTextfieldDropdown />
          </tui-textfield>
        </div>
      </div>
      <!-- Size & Sex -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Size -->
        <div>
          <tui-textfield class="w-full" [tuiTextfieldCleaner]="false">
            <label tuiLabel for="sizeInput">{{
              'labels.size' | translate
            }}</label>
            <input
              id="sizeInput"
              tuiInputNumber
              [min]="0"
              [max]="300"
              [(ngModel)]="size"
              (blur)="saveSize()"
              (keydown.enter)="saveSize()"
            />
            <span class="tui-textfield__suffix">cm</span>
          </tui-textfield>
        </div>
        <!-- Sex -->
        <div>
          <tui-textfield
            tuiChevron
            class="w-full"
            [tuiTextfieldCleaner]="true"
            [stringify]="stringifySex()"
          >
            <label tuiLabel for="sexSelect">{{
              'labels.sex' | translate
            }}</label>
            <input
              id="sexSelect"
              tuiSelect
              [(ngModel)]="sex"
              (ngModelChange)="saveSex()"
            />
            <tui-data-list-wrapper *tuiTextfieldDropdown new [items]="sexes" />
          </tui-textfield>
        </div>
      </div>

      <br />

      <!-- PREFERENCES -->
      <h2 class="text-lg font-bold">
        {{ 'labels.preferences' | translate }}
      </h2>
      <!-- Language & Theme -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Language -->
        <div>
          <tui-textfield
            tuiChevron
            [tuiTextfieldCleaner]="false"
            [stringify]="stringifyLanguage()"
          >
            <label tuiLabel for="languageSelect">{{
              'labels.language' | translate
            }}</label>
            <input
              id="languageSelect"
              tuiSelect
              [(ngModel)]="language"
              (ngModelChange)="saveLanguage()"
            />
            <tui-data-list-wrapper
              *tuiTextfieldDropdown
              new
              [items]="languages"
            />
          </tui-textfield>
        </div>
        <!-- Theme & Private profile -->
        <div class="flex flex-col items-end gap-4">
          <div class="flex items-center gap-4">
            <label tuiLabel for="themeSwitch">{{
              'labels.darkMode' | translate
            }}</label>
            <input
              id="themeSwitch"
              tuiSwitch
              type="checkbox"
              [ngModel]="theme === Themes.DARK"
              (ngModelChange)="toggleTheme($event)"
            />
          </div>

          <div class="flex items-center gap-4">
            <label tuiLabel for="privateSwitch">{{
              'labels.privateProfile' | translate
            }}</label>
            <input
              id="privateSwitch"
              tuiSwitch
              type="checkbox"
              [ngModel]="isPrivate"
              (ngModelChange)="togglePrivateProfile($event)"
            />
          </div>
        </div>
      </div>

      <br />

      <!-- Logout button -->
      <div class="flex items-center justify-center">
        <button
          tuiButton
          appearance="action-destructive"
          type="button"
          size="m"
          (click)="logout()"
        >
          {{ 'auth.logout' | translate }}
        </button>
      </div>
    </section>
  `,
})
export class UserProfileConfigComponent {
  protected readonly global = inject(GlobalData);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);
  private readonly userProfilesService = inject(UserProfilesService);
  private readonly toast = inject(TuiToastService);
  private readonly translate = inject(TranslateService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly dialogContext: TuiDialogContext<unknown, unknown> | null =
    (() => {
      try {
        return injectContext<TuiDialogContext<unknown, unknown>>();
      } catch {
        return null;
      }
    })();

  protected readonly profile = computed(() => this.global.userProfile());
  protected avatarHovered = signal(false);
  protected isUploadingAvatar = signal(false);
  protected avatarSrc = computed<string>(() => {
    const hovered = this.avatarHovered();
    const avatar = this.global.userAvatar();
    if (hovered) return '@tui.image-up';
    if (avatar) return avatar;
    return '@tui.user';
  });

  // Editable fields
  displayName = '';
  bio = '';
  language: Language = Languages.ES;
  theme: Theme = Themes.LIGHT;
  country: string | null = null;
  city: string | null = null;
  birthDate: TuiDay | null = null;
  startingClimbingYear: number | null = null;
  size: number | null = null;
  sex: Sex | null = null;
  isPrivate = false;

  // Validation helpers and bounds
  readonly today: TuiDay = TuiDay.currentLocal();
  readonly minBirthDate: TuiDay = new TuiDay(1900, 0, 1);
  readonly currentYear: number = new Date().getFullYear();
  readonly minYear: number = 1900;

  // Theme switcher
  readonly Themes = Themes;

  // Language selector
  readonly languages: Language[] = [Languages.ES, Languages.EN];
  readonly stringifyLanguage = computed(() => {
    this.profile();
    this.global.i18nTick();
    return (x: unknown): string => {
      if (typeof x !== 'string') return String(x);
      const key = `options.language.${x}`;
      const tr = this.translate.instant(key);
      return tr && tr !== key ? tr : x;
    };
  });

  // Sex selector
  readonly sexes: Sex[] = [Sexes.MALE, Sexes.FEMALE, Sexes.OTHER];
  readonly stringifySex = computed(() => {
    this.profile();
    this.global.i18nTick();
    return (x: unknown): string => {
      if (typeof x !== 'string') return String(x);
      const key = `options.sex.${x}`;
      const tr = this.translate.instant(key);
      return tr && tr !== key ? tr : x;
    };
  });

  // Country selector
  readonly countries = toSignal(
    inject(TUI_COUNTRIES).pipe(
      map((x) =>
        Object.entries(x).map(([id, name]) => ({ id, name }) as Country),
      ),
    ),
    { initialValue: [] as Country[] },
  );
  readonly countryIds = computed(() => this.countries().map((c) => c.id));
  readonly countryNameMap = computed(() => {
    const map = new Map<string, string>();
    this.countries().forEach((c) => map.set(c.id, c.name));
    return map;
  });
  idToName = (id: string): string => this.countryNameMap().get(id) ?? id;
  stringifyCountryId = (id: string | null): string =>
    id ? this.idToName(id) : '';
  readonly matcher: TuiStringMatcher<string> = (id, search) =>
    this.idToName(id)?.toLowerCase() === search.toLowerCase();

  constructor() {
    effect(() => {
      const userProfile = this.profile();
      if (userProfile) void this.loadProfile();
    });
  }

  private showToast(
    messageKey: string,
    options: Partial<TuiToastOptions<string>>,
  ): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const message = this.translate.instant(messageKey);
    this.toast.open(message, options).subscribe();
  }

  async loadProfile(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const profile = this.profile();
    if (!profile) return;

    this.displayName = profile.name || '';
    this.bio = profile.bio || '';
    this.language = (profile.language as Language) || Languages.ES;
    this.theme = (profile.theme as Theme) || Themes.LIGHT;
    this.country = profile.country || null;
    this.city = profile.city || null;
    this.sex = (profile.sex as Sex) || null;
    this.size = profile.size || null;
    this.startingClimbingYear = profile.starting_climbing_year || null;
    this.isPrivate = !!profile.private;

    if (profile.birth_date) {
      const date = new Date(profile.birth_date);
      this.birthDate = new TuiDay(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      );
    }
  }

  async togglePrivateProfile(isPrivate: boolean): Promise<void> {
    if (this.isPrivate === isPrivate) {
      return;
    }
    this.isPrivate = isPrivate;
    await this.updateProfile({ private: this.isPrivate });
  }

  async saveName(): Promise<void> {
    const trimmed = (this.displayName ?? '').trim();
    if (!trimmed) {
      const current = this.profile();
      this.displayName = current?.name ?? '';
      this.showToast('profile.name.required', { data: '@tui.circle-alert' });
      return;
    }
    if (trimmed.length < 3 || trimmed.length > 50) {
      // Restore previous valid value for UX consistency
      const current = this.profile();
      this.displayName = current?.name ?? '';
      this.showToast('profile.name.length', { data: '@tui.circle-alert' });
      return;
    }
    if (trimmed === (this.profile()?.name ?? '')) {
      return;
    }
    await this.updateProfile({ name: trimmed });
  }

  async saveBio(): Promise<void> {
    const trimmed = (this.bio ?? '').trim();
    const current = this.profile();

    if (trimmed.length > 500) {
      this.bio = current?.bio ?? '';
      this.showToast('profile.bio.tooLong', { data: '@tui.circle-alert' });
      return;
    }

    if (trimmed === (current?.bio ?? '')) {
      this.bio = current?.bio ?? '';
      return;
    }
    await this.updateProfile({ bio: trimmed });
  }

  async toggleTheme(isDark: boolean): Promise<void> {
    const newTheme = isDark ? Themes.DARK : Themes.LIGHT;
    if (this.theme === newTheme) {
      return;
    }
    this.theme = newTheme;
    await this.updateProfile({ theme: this.theme });
  }

  async saveLanguage(): Promise<void> {
    const current = this.profile();
    if (this.language === (current?.language ?? null)) {
      return;
    }
    await this.updateProfile({ language: this.language });
  }

  async saveCountry(): Promise<void> {
    const current = this.profile();
    // Ensure selected country is valid or null
    const validIds = new Set(this.countryIds());
    if (this.country && !validIds.has(this.country)) {
      this.country = current?.country ?? null;
      this.showToast('profile.country.invalid', { data: '@tui.circle-alert' });
      return;
    }
    if (this.country === (current?.country ?? null)) {
      return;
    }
    await this.updateProfile({ country: this.country });
  }

  async saveCity(): Promise<void> {
    const current = this.profile();
    if (this.city && this.city.length > 100) {
      this.city = current?.city ?? null;
      this.showToast('profile.city.tooLong', { data: '@tui.circle-alert' });
      return;
    }
    if (this.city === (current?.city ?? null)) {
      return;
    }
    await this.updateProfile({ city: this.city });
  }

  async saveBirthDate(): Promise<void> {
    const current = this.profile();
    const currentDate = current?.birth_date
      ? new Date(current.birth_date).toISOString().split('T')[0]
      : null;
    const newDate = this.birthDate
      ? `${this.birthDate.year}-${String(this.birthDate.month + 1).padStart(2, '0')}-${String(this.birthDate.day).padStart(2, '0')}`
      : null;
    if (this.birthDate) {
      // Reject future dates or dates before minBirthDate
      if (
        this.birthDate.dayBefore(this.minBirthDate) ||
        this.today.dayBefore(this.birthDate)
      ) {
        this.birthDate = current?.birth_date
          ? new TuiDay(
              new Date(current.birth_date).getFullYear(),
              new Date(current.birth_date).getMonth(),
              new Date(current.birth_date).getDate(),
            )
          : null;
        this.showToast('profile.birthDate.invalid', {
          data: '@tui.circle-alert',
        });
        return;
      }
    }
    if (newDate === currentDate) {
      return;
    }
    await this.updateProfile({ birth_date: newDate });
  }

  async saveStartingClimbingYear(): Promise<void> {
    const current = this.profile();
    const newYear = this.startingClimbingYear ?? null;
    if (newYear !== null) {
      if (newYear < this.minYear || newYear > this.currentYear) {
        this.startingClimbingYear = current?.starting_climbing_year ?? null;
        this.showToast('profile.startingYear.invalid', {
          data: '@tui.circle-alert',
        });
        return;
      }
    }
    if (newYear === (current?.starting_climbing_year ?? null)) {
      return;
    }
    await this.updateProfile({ starting_climbing_year: newYear });
  }

  async saveSize(): Promise<void> {
    const current = this.profile();
    if (this.size !== null) {
      if (this.size < 0 || this.size > 300) {
        this.size = current?.size ?? null;
        this.showToast('profile.size.invalid', { data: '@tui.circle-alert' });
        return;
      }
    }
    if (this.size === (current?.size ?? null)) {
      return;
    }
    await this.updateProfile({ size: this.size });
  }

  async saveSex(): Promise<void> {
    const current = this.profile();
    if (this.sex === (current?.sex ?? null)) {
      return;
    }
    await this.updateProfile({ sex: this.sex });
  }

  async uploadAvatar(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (event: Event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];

      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        console.error('Please select an image file');
        this.showToast('profile.avatar.upload.invalidType', {
          data: 'tui.circle-alert',
        });
        return;
      }

      // Validate file size (e.g., max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        console.error('File size must be less than 5MB');
        this.showToast('profile.avatar.upload.tooLarge', {
          data: '@tui.circle-alert',
        });
        return;
      }

      // Open the cropper dialog and wait for confirmation
      this.dialogs
        .open<AvatarCropperResult | null>(
          new PolymorpheusComponent(AvatarCropperComponent),
          {
            size: 'm',
            data: { file, size: 512 },
            appearance: 'fullscreen',
            closable: false,
          },
        )
        .subscribe({
          next: async (result) => {
            if (!result) return; // canceled
            const croppedFile = new File([result.blob], result.fileName, {
              type: result.mimeType,
              lastModified: Date.now(),
            });
            this.isUploadingAvatar.set(true);
            try {
              const upload = await this.supabase.uploadAvatar(croppedFile);
              if (!upload) return;
              this.showToast('profile.avatar.upload.success', {
                data: '@tui.circle-check',
              });
              this.supabase.userProfileResource.reload();
            } catch (e) {
              console.error('Error uploading avatar:', e);
              this.showToast('profile.avatar.upload.error', {
                data: '@tui.circle-x',
              });
            } finally {
              this.isUploadingAvatar.set(false);
            }
          },
        });
    };

    // Trigger file selection
    input.click();
  }

  private async updateProfile(updates: Partial<UserProfileDto>): Promise<void> {
    const result = await this.userProfilesService.updateUserProfile(updates);

    if (!result.success) {
      console.error('Error saving profile:', result.error);
      this.showToast('Error: ' + result.error, {
        data: '@tui.circle-x',
      });
    }
  }

  async logout(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    await this.supabase.logout();
    this.close();
  }

  close(): void {
    this.dialogContext?.$implicit.complete();
  }
}
