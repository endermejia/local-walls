import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  resource,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  form,
  max,
  maxLength,
  min,
  minLength,
  required,
} from '@angular/forms/signals';
import { Router } from '@angular/router';

import { TuiDay, TuiStringMatcher } from '@taiga-ui/cdk';
import {
  tuiDateFormatProvider,
  TuiDialogService,
  TuiIcon,
  TuiScrollbar,
  TuiTitle,
  type TuiDialogContext,
} from '@taiga-ui/core';
import { TUI_CONFIRM, TUI_COUNTRIES, type TuiConfirmData } from '@taiga-ui/kit';
import { TuiHeader } from '@taiga-ui/layout';
import {
  injectContext,
  PolymorpheusComponent,
  PolymorpheusContent,
} from '@taiga-ui/polymorpheus';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import {
  debounceTime,
  filter,
  firstValueFrom,
  map,
  Observer,
  of,
  Subject,
  switchMap,
  tap,
} from 'rxjs';

import { AudioPreferencesService } from '../../services/audio-preferences.service';
import { AuthStateService } from '../../services/auth-state.service';
import { EightAnuService } from '../../services/eight-anu.service';
import { FollowRequestsService } from '../../services/follow-requests.service';
import { LanguageService } from '../../services/language.service';
import { MerchandiseService } from '../../services/merchandise.service';
import { SupabaseService } from '../../services/supabase.service';
import { ThemeService } from '../../services/theme.service';
import { ToastService } from '../../services/toast.service';
import { TourService, TourStep } from '../../services/tour.service';
import { UserProfilesService } from '../../services/user-profiles.service';

import { FirstStepsDialogComponent } from '../../components/dialogs/first-steps-dialog';
import { FollowRequestsDialogComponent } from '../../components/dialogs/follow-requests-dialog';
import { TourHintComponent } from '../../components/ui/tour-hint';
import { Profile8aSectionComponent } from '../../components/user-profile/profile-8a-section';
import { ProfileDangerZoneComponent } from '../../components/user-profile/profile-danger-zone';
import { ProfileGeneralSectionComponent } from '../../components/user-profile/profile-general-section';
import { ProfilePreferencesComponent } from '../../components/user-profile/profile-preferences';

import {
  EightAnuUser,
  Language,
  Languages,
  Sex,
  Sexes,
  Theme,
  Themes,
  UserProfileDto,
} from '../../models';

import { isComplexPassword } from '../../utils';

import { IS_BROWSER } from '../../app/is-browser';

interface Country {
  id: string;
  name: string;
}

@Component({
  selector: 'app-user-profile-config',
  standalone: true,
  imports: [
    FormsModule,
    Profile8aSectionComponent,
    ProfileDangerZoneComponent,
    ProfileGeneralSectionComponent,
    ProfilePreferencesComponent,
    TourHintComponent,
    TranslatePipe,
    TuiHeader,
    TuiIcon,
    TuiScrollbar,
    TuiTitle,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [tuiDateFormatProvider({ mode: 'dd/mm/yyyy', separator: '/' })],
  host: { class: 'flex grow min-h-0' },
  template: `
    <tui-scrollbar class="flex grow">
      <section
        class="w-full max-w-5xl mx-auto p-4 grid grid-cols-1 gap-4 pb-32"
      >
        <!-- Sticky Header -->
        <header
          tuiHeader
          class="sticky top-0 z-10 flex items-center gap-4 p-4 -mt-4 -mx-4 mb-4"
        >
          <h1 tuiTitle>
            <button
              class="no-underline text-inherit flex items-center gap-2 bg-transparent border-none p-0 cursor-pointer text-left outline-none"
              (click)="isFirstSteps() ? startTour() : close()"
              [disabled]="
                isFirstSteps() &&
                (profileForm.fullName().invalid() ||
                  profileForm.fullName().value() === userEmail())
              "
            >
              <tui-icon icon="@tui.arrow-left" />
              {{ (isFirstSteps() ? 'next' : 'profile.title') | translate }}
            </button>
          </h1>
        </header>

        <!-- General Section -->
        <app-profile-general-section
          [model]="model()"
          [profileForm]="profileForm"
          [userEmail]="userEmail()"
          [avatarSrc]="avatarSrc()"
          [hasAvatar]="!!(profile()?.avatar || authState.userAvatar())"
          [isUploadingAvatar]="isUploadingAvatar()"
          [isFirstSteps]="isFirstSteps()"
          [nameEqualsEmail]="nameEqualsEmail()"
          [countryIds]="countryIds()"
          [countryDictionary]="countryDictionary()"
          [stringifyCountryId]="stringifyCountryId"
          [matcher]="matcher"
          [stringifySex]="stringifySex()"
          [fullNameError]="fullNameError()"
          [bioError]="bioError()"
          [countryError]="countryError()"
          [cityError]="cityError()"
          [birthDateError]="birthDateError()"
          [startingClimbingYearError]="startingClimbingYearError()"
          [sizeError]="sizeError()"
          [sexError]="sexError()"
          (updateModel)="onChildUpdateModel($event)"
          (saveField)="onSaveField($event)"
          (uploadAvatar)="uploadAvatar()"
          (deleteAvatar)="deleteAvatar()"
        />

        <!-- Preferences Section -->
        <app-profile-preferences
          [model]="model()"
          [profileForm]="profileForm"
          [languages]="languages()"
          [stringifyLanguage]="stringifyLanguage()"
          [userEmail]="userEmail()"
          [languageError]="languageError()"
          (updateModel)="onChildUpdateModel($event)"
          (saveLanguage)="saveLanguage()"
          (toggleTheme)="toggleTheme($event)"
          (restartFirstStepsChange)="onRestartFirstStepsChange($event)"
          (messageSoundChange)="onMessageSoundChange($event)"
          (notificationSoundChange)="onNotificationSoundChange($event)"
          (privateProfileChange)="onPrivateProfileChange($event)"
          (editingModeChange)="onEditingModeChange($event)"
        />

        <!-- Account Actions Header -->
        <h2
          class="text-xl font-bold mt-12 mb-6 border-t border-(--tui-border-normal) pt-8"
        >
          {{ 'accountActions' | translate }}
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Tools & Management Section -->
          <app-profile-8a-section
            [isPrivate]="model().isPrivate"
            [pendingRequestsCount]="pendingRequestsCount()"
            (openFollowRequests)="openFollowRequestsDialog()"
            (openPurchaseHistory)="openPurchaseHistoryDialog()"
            (openImport8a)="openImport8aDialog()"
          />

          <!-- Security & Session Section -->
          <app-profile-danger-zone
            [userEmail]="userEmail()"
            [passwordModel]="passwordModel()"
            [passwordError]="passwordError()"
            [isUpdatingPassword]="isUpdatingPassword()"
            [deleteEmail]="model().deleteEmail"
            [deleteEmailError]="deleteEmailError()"
            [deleteEmailInvalid]="
              profileForm.deleteEmail().invalid() &&
              profileForm.deleteEmail().touched()
            "
            (updatePasswordModel)="onChildUpdatePasswordModel($event)"
            (updateDeleteEmail)="updateModel('deleteEmail', $event)"
            (openChangePassword)="openChangePasswordDialog($event)"
            (confirmChangePassword)="confirmChangePassword($event)"
            (logout)="logout()"
            (openDeleteAccount)="deleteAccount($event)"
            (confirmDeleteAccount)="confirmDeleteAccount($event)"
          />
        </div>
      </section>
    </tui-scrollbar>

    <ng-template #tourHint>
      <app-tour-hint
        [description]="'tour.config.description' | translate"
        (next)="tourService.next()"
        (skip)="tourService.finish()"
        [disabled]="
          profileForm.fullName().invalid() ||
          profileForm.fullName().value() === userEmail()
        "
        [showSkip]="false"
      />
    </ng-template>
  `,
})
export class UserProfileConfigComponent {
  protected readonly authState = inject(AuthStateService);
  protected readonly audioPrefs = inject(AudioPreferencesService);
  protected readonly languageService = inject(LanguageService);
  protected readonly themeService = inject(ThemeService);
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly supabase = inject(SupabaseService);

  private readonly userProfilesService = inject(UserProfilesService);
  protected readonly tourService = inject(TourService);
  protected readonly TourStep = TourStep;
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  protected readonly followRequestsService = inject(FollowRequestsService);
  readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly dialogs = inject(TuiDialogService);
  private readonly merchService = inject(MerchandiseService);

  /**
   * Used to coordinate the success toast with language changes.
   * If a language is changed, we want the toast to appear in the NEW language.
   */
  private readonly pendingSuccessToast = signal<{
    key: string;
    lang: Language;
  } | null>(null);

  private readonly dialogContext: TuiDialogContext<unknown, unknown> | null =
    (() => {
      try {
        return injectContext<TuiDialogContext<unknown, unknown>>();
      } catch {
        return null;
      }
    })();

  protected readonly profile = computed(() => this.authState.userProfile());
  protected readonly isFirstSteps = computed(
    () => this.profile()?.first_steps ?? false,
  );
  private hasOpenedWelcome = false;
  protected readonly eightAnuService = inject(EightAnuService);

  protected readonly eightAnuShowLoader = signal(false);
  protected readonly eightAnuSearch$ = new Subject<string>();
  protected readonly eightAnuResults = toSignal(
    this.eightAnuSearch$.pipe(
      debounceTime(0),
      filter(() => !this.selectedEightAnuUser.value()),
      tap(() => this.eightAnuShowLoader.set(true)),
      debounceTime(300),
      switchMap((query: string) =>
        query.length >= 3
          ? this.eightAnuService
              .searchUsers(query)
              .pipe(map((res: { items: EightAnuUser[] }) => res.items))
          : of([]),
      ),
      tap(() => this.eightAnuShowLoader.set(false)),
    ),
  );

  protected lastEvent?: MouseEvent;
  readonly selectedEightAnuUser = resource<EightAnuUser | null, string | null>({
    params: () => null,
    loader: async () => null,
  });
  protected readonly userEmail = computed(
    () => this.supabase.authUser()?.email ?? '',
  );
  protected readonly nameEqualsEmail = computed(() => {
    const profile = this.profile();
    const email = this.userEmail();
    return profile?.name === email && email !== '';
  });
  protected isUploadingAvatar = signal(false);
  protected readonly avatarSrc = computed<string | null>(() => {
    return this.authState.userAvatar() || null;
  });

  protected readonly model = signal({
    fullName: '',
    bio: '',
    language: Languages.ES as Language,
    theme: Themes.LIGHT as Theme,
    country: null as string | null,
    city: '',
    birth_date: null as TuiDay | null,
    starting_climbing_year: null as number | null,
    size: null as number | null,
    sex: null as Sex | null,
    isPrivate: false,
    eightAnuUser: null as EightAnuUser | null,
    deleteEmail: '',
    messageSound: true,
    notificationSound: true,
    editingMode: false,
    restartFirstSteps: false,
  });

  protected readonly profileForm = form(this.model, (schemaPath) => {
    required(schemaPath.fullName, { message: 'profile.name.required' });
    minLength(schemaPath.fullName, 3, { message: 'profile.name.length' });
    maxLength(schemaPath.fullName, 50, { message: 'profile.name.length' });

    maxLength(schemaPath.bio, 50, { message: 'profile.bio.tooLong' });
    maxLength(schemaPath.city, 100, { message: 'profile.city.tooLong' });

    min(schemaPath.starting_climbing_year, 1900, {
      message: 'profile.startingYear.invalid',
    });
    max(schemaPath.starting_climbing_year, new Date().getFullYear(), {
      message: 'profile.startingYear.invalid',
    });

    min(schemaPath.size, 0, { message: 'profile.size.invalid' });
    max(schemaPath.size, 300, { message: 'profile.size.invalid' });

    required(schemaPath.deleteEmail, { message: 'errors.required' });
  });

  protected readonly fullNameError = computed(() =>
    this.getFieldError('fullName'),
  );
  protected readonly bioError = computed(() => this.getFieldError('bio'));
  protected readonly countryError = computed(() =>
    this.getFieldError('country'),
  );
  protected readonly cityError = computed(() => this.getFieldError('city'));
  protected readonly birthDateError = computed(() =>
    this.getFieldError('birth_date'),
  );
  protected readonly startingClimbingYearError = computed(() =>
    this.getFieldError('starting_climbing_year'),
  );
  protected readonly sizeError = computed(() => this.getFieldError('size'));
  protected readonly sexError = computed(() => this.getFieldError('sex'));
  protected readonly languageError = computed(() =>
    this.getFieldError('language'),
  );
  protected readonly deleteEmailError = computed(() =>
    this.getFieldError('deleteEmail'),
  );

  // Validation helpers and bounds
  readonly today: TuiDay = TuiDay.currentLocal();
  readonly minBirthDate: TuiDay = new TuiDay(1900, 0, 1);
  readonly currentYear: number = new Date().getFullYear();
  readonly minYear: number = 1900;

  // Theme switcher
  readonly Themes = Themes;

  // Language selector
  protected readonly languages = computed(() => {
    this.languageService.i18nTick();
    const allLangs = Object.values(Languages) as Language[];
    return allLangs.sort((a, b) => {
      const labelA = this.translate.instant(`options.language.${a}`);
      const labelB = this.translate.instant(`options.language.${b}`);
      return labelA.localeCompare(labelB);
    });
  });
  readonly stringifyLanguage = computed(() => {
    this.profile();
    this.languageService.i18nTick();
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
    this.languageService.i18nTick();
    return (x: unknown): string => {
      if (typeof x !== 'string') return String(x);
      const key = `options.sex.${x}`;
      const tr = this.translate.instant(key);
      return tr && tr !== key ? tr : x;
    };
  });

  // Country selector
  private readonly countriesMap = inject(TUI_COUNTRIES);
  readonly countries = computed(() => {
    const x = this.countriesMap();
    return Object.entries(x).map(([id, name]) => ({ id, name }) as Country);
  });
  protected readonly countryIds = computed(() =>
    (this.countries() || []).map((c) => c.id),
  );
  protected readonly years = Array.from(
    { length: new Date().getFullYear() - 1900 + 1 },
    (_, i) => new Date().getFullYear() - i,
  );
  protected readonly countryDictionary = computed(() => {
    const dict: Record<string, string> = {};
    (this.countries() || []).forEach((c) => (dict[c.id] = c.name));
    return dict;
  });
  stringifyCountryId = (id: unknown): string =>
    typeof id === 'string' ? (this.countryDictionary()[id] ?? id) : '';
  readonly matcher: TuiStringMatcher<string> = (id, search) =>
    (this.countryDictionary()[id] ?? id).toLowerCase() === search.toLowerCase();

  protected onChildUpdateModel(event: { field: string; value: unknown }): void {
    this.updateModel(
      event.field as keyof ReturnType<typeof this.model>,
      event.value as never,
    );
  }

  protected onChildUpdatePasswordModel(event: {
    field: string;
    value: string;
  }): void {
    this.updatePasswordModel(
      event.field as 'newPassword' | 'confirmPassword',
      event.value,
    );
  }

  stringifyEightAnuUser = (user: EightAnuUser | null): string =>
    user?.userName || '';

  // ----- Data -----

  protected readonly pendingRequestsCountResource = resource({
    params: () => this.followRequestsService.requestsChange(),
    loader: async () => {
      if (!this.isBrowser) return 0;
      return await this.followRequestsService.getIncomingRequestsCount();
    },
  });

  protected readonly pendingRequestsCount = computed(
    () => this.pendingRequestsCountResource.value() ?? 0,
  );

  constructor() {
    effect(() => {
      const userProfile = this.profile();
      if (userProfile) void this.loadProfile();
    });

    effect(() => {
      const pending = this.pendingSuccessToast();
      if (!pending) {
        return;
      }

      const currentLang = this.languageService.currentLang();

      if (currentLang === pending.lang) {
        untracked(() => {
          this.toast.success(pending.key);
          this.pendingSuccessToast.set(null);
        });
      }
    });

    effect(() => {
      if (
        this.isFirstSteps() &&
        !this.hasOpenedWelcome &&
        this.tourService.step() === TourStep.OFF &&
        this.isBrowser
      ) {
        this.hasOpenedWelcome = true;

        if (!this.isFirstSteps()) return;
        this.openWelcomeDialog();
      }
    });
  }

  private async openWelcomeDialog(): Promise<void> {
    await firstValueFrom(
      this.dialogs.open(new PolymorpheusComponent(FirstStepsDialogComponent), {
        size: 'm',
        dismissible: false,
        closable: false,
      }),
      { defaultValue: undefined },
    );
    void this.tourService.start();
  }

  async loadProfile(): Promise<void> {
    if (!this.isBrowser) return;

    const profile = this.profile();
    if (!profile) return;

    const name = profile.name || '';
    let birth_date: TuiDay | null = null;
    if (profile.birth_date) {
      const date = new Date(profile.birth_date);
      birth_date = new TuiDay(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      );
    }

    this.model.set({
      fullName: name === this.userEmail() && profile.first_steps ? '' : name,
      bio: profile.bio || '',
      language: (profile.language as Language) || Languages.ES,
      theme: (profile.theme as Theme) || Themes.LIGHT,
      country: profile.country || (this.isFirstSteps() ? 'ES' : null),
      city: profile.city || '',
      sex: (profile.sex as Sex) || null,
      size: profile.size || null,
      starting_climbing_year: profile.starting_climbing_year || null,
      isPrivate: !!profile.private,
      birth_date,
      eightAnuUser: this.selectedEightAnuUser.value() || null,
      deleteEmail: '',
      messageSound:
        profile.message_sound ?? this.audioPrefs.messageSoundEnabled(),
      notificationSound:
        profile.notification_sound ??
        this.audioPrefs.notificationSoundEnabled(),
      editingMode: profile.editing_mode ?? this.authState.editingMode(),
      restartFirstSteps: false,
    });
  }

  async togglePrivateProfile(isPrivate: boolean): Promise<void> {
    if (isPrivate) {
      const confirmed = await firstValueFrom(
        this.dialogs.open<boolean>(TUI_CONFIRM, {
          label: this.translate.instant('privateProfile'),
          size: 'm',
          data: {
            content: this.translate.instant('profile.private.confirmation'),
            yes: this.translate.instant('accept'),
            no: this.translate.instant('cancel'),
          },
        }),
        { defaultValue: false },
      );

      if (!confirmed) {
        this.updateModel('isPrivate', false);
        return;
      }
    }

    await this.updateProfile({ private: isPrivate }, 'profile.updated.private');
  }

  protected onSaveField(fieldName: string): void {
    switch (fieldName) {
      case 'fullName':
        void this.saveName();
        break;
      case 'bio':
        void this.saveBio();
        break;
      case 'country':
        void this.saveCountry();
        break;
      case 'city':
        void this.saveCity();
        break;
      case 'birth_date':
        void this.saveBirthDate();
        break;
      case 'starting_climbing_year':
        void this.saveStartingClimbingYear();
        break;
      case 'size':
        void this.saveSize();
        break;
      case 'sex':
        void this.saveSex();
        break;
    }
  }

  private async saveField<K extends keyof UserProfileDto, V = unknown>(
    field: K,
    control: { value: () => V; invalid: () => boolean },
    options: {
      transform?: (val: V) => UserProfileDto[K];
      validate?: (val: UserProfileDto[K]) => string | null;
      errorMessage?: string;
      errorType?: 'info' | 'error';
    } = {},
  ): Promise<void> {
    const current = this.profile();
    const value = options.transform
      ? options.transform(control.value())
      : (control.value() as UserProfileDto[K]);

    const validationError = options.validate ? options.validate(value) : null;
    if (control.invalid() || validationError) {
      const errorKey = validationError || options.errorMessage;
      if (errorKey) {
        if (options.errorType === 'info') {
          this.toast.info(errorKey);
        } else {
          this.toast.error(errorKey);
        }
      }
      await this.loadProfile();
      return;
    }

    if (value === (current?.[field] ?? null)) {
      return;
    }

    await this.updateProfile(
      { [field]: value },
      `profile.updated.${String(field)}`,
    );
  }

  async saveName(): Promise<void> {
    await this.saveField('name', this.profileForm.fullName(), {
      transform: (v: string | null) => (v || '').trim(),
      validate: (v) => {
        if (!v) return 'profile.name.required';
        if (v.length < 3 || v.length > 50) return 'profile.name.length';
        return null;
      },
      errorType: 'info',
    });
  }

  async saveBio(): Promise<void> {
    await this.saveField('bio', this.profileForm.bio(), {
      transform: (v: string | null) => (v || '').trim(),
      errorMessage: 'profile.bio.tooLong',
      errorType: 'info',
    });
  }

  async toggleTheme(isDark: boolean): Promise<void> {
    const newTheme = isDark ? Themes.DARK : Themes.LIGHT;
    if (this.model().theme === newTheme) {
      return;
    }
    this.model.update((m) => ({ ...m, theme: newTheme }));
    this.themeService.setTheme(newTheme, this.lastEvent);
    await this.updateProfile({ theme: newTheme }, 'profile.updated.theme');
  }

  async saveLanguage(): Promise<void> {
    await this.saveField('language', this.profileForm.language());
  }

  async saveCountry(): Promise<void> {
    await this.saveField('country', this.profileForm.country(), {
      validate: (v) => {
        const validIds = new Set(this.countryIds());
        return v && !validIds.has(v) ? 'profile.country.invalid' : null;
      },
    });
  }

  async saveCity(): Promise<void> {
    await this.saveField('city', this.profileForm.city(), {
      errorMessage: 'profile.city.tooLong',
      errorType: 'info',
    });
  }

  async saveBirthDate(): Promise<void> {
    await this.saveField('birth_date', this.profileForm.birth_date(), {
      transform: (bd: TuiDay | null) =>
        bd
          ? `${bd.year}-${String(bd.month + 1).padStart(2, '0')}-${String(bd.day).padStart(2, '0')}`
          : null,
      validate: () => {
        const bd = this.profileForm.birth_date().value();
        if (
          bd &&
          (bd.dayBefore(this.minBirthDate) || this.today.dayBefore(bd))
        ) {
          return 'profile.birthDate.invalid';
        }
        return null;
      },
    });
  }

  async saveStartingClimbingYear(): Promise<void> {
    await this.saveField(
      'starting_climbing_year',
      this.profileForm.starting_climbing_year(),
      {
        errorMessage: 'profile.startingYear.invalid',
      },
    );
  }

  async saveSize(): Promise<void> {
    await this.saveField('size', this.profileForm.size(), {
      errorMessage: 'profile.size.invalid',
    });
  }

  async saveSex(): Promise<void> {
    await this.saveField('sex', this.profileForm.sex());
  }

  updateModel<K extends keyof ReturnType<typeof this.model>>(
    key: K,
    value: ReturnType<typeof this.model>[K],
  ): void {
    this.model.update((m) => ({ ...m, [key]: value }));
  }

  onEightAnuInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.eightAnuSearch$.next(value);
  }

  protected getFieldError(fieldName: string): string | null {
    const formKey = fieldName as Extract<
      keyof typeof this.profileForm,
      keyof ReturnType<typeof this.model>
    >;
    const fieldFn = this.profileForm[formKey];
    if (!fieldFn || typeof fieldFn !== 'function') return null;
    const field = fieldFn();
    if (!field || !field.invalid() || !field.touched() || !this.profile())
      return null;

    const errors = field.errors();
    if (!errors || errors.length === 0) return null;

    const firstError = errors[0];

    if (firstError?.message) {
      return this.translate.instant(firstError.message);
    }

    const key =
      firstError?.kind ||
      (typeof firstError === 'object'
        ? Object.keys(firstError).find((k) => k !== '__brand')
        : firstError) ||
      'error';

    if (fieldName === 'fullName') {
      if (key === 'required')
        return this.translate.instant('profile.name.required');
      if (key === 'minLength' || key === 'maxLength')
        return this.translate.instant('profile.name.length');
    }

    if (fieldName === 'bio' && key === 'maxLength') {
      return this.translate.instant('profile.bio.tooLong');
    }

    if (fieldName === 'city' && key === 'maxLength') {
      return this.translate.instant('profile.city.tooLong');
    }

    if (
      fieldName === 'starting_climbing_year' &&
      (key === 'min' || key === 'max')
    ) {
      return this.translate.instant('profile.startingYear.invalid');
    }

    if (fieldName === 'size' && (key === 'min' || key === 'max')) {
      return this.translate.instant('profile.size.invalid');
    }

    if (fieldName === 'birth_date' && (key === 'min' || key === 'max')) {
      return this.translate.instant('profile.birthDate.invalid');
    }

    if (fieldName === 'deleteEmail' && key === 'required') {
      return this.translate.instant('errors.required');
    }

    return null;
  }

  async saveEightAnuUser(user: unknown): Promise<void> {
    const eightAnuUser = user as EightAnuUser | null;
    await this.updateProfile(
      {
        '8anu_user_slug': eightAnuUser?.userSlug || null,
      },
      'profile.updated.8anu_user_slug',
    );
    void this.selectedEightAnuUser.reload();
  }

  async uploadAvatar(): Promise<void> {
    if (!this.isBrowser) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (event: Event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];

      if (!file) return;

      if (!file.type.startsWith('image/')) {
        console.error('Please select an image file');
        this.toast.error('profile.avatar.upload.invalidType');
        return;
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        console.error('File size must be less than 5MB');
        this.toast.error('profile.avatar.upload.tooLarge');
        return;
      }

      const result = await firstValueFrom(
        this.userProfilesService.openAvatarCropper(file, 512),
        { defaultValue: null },
      );

      if (!result) return;
      const croppedFile = result;
      this.isUploadingAvatar.set(true);
      try {
        const upload = await this.supabase.uploadAvatar(croppedFile);
        if (!upload) return;
        this.toast.success('profile.avatar.upload.success');
        this.supabase.userProfileResource.reload();
      } catch (e) {
        console.error('Error uploading avatar:', e);
        this.toast.error('profile.avatar.upload.error');
      } finally {
        this.isUploadingAvatar.set(false);
      }
    };

    input.click();
  }

  async deleteAvatar(): Promise<void> {
    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('profile.avatar.delete.title'),
        size: 's',
        data: {
          content: this.translate.instant('profile.avatar.delete.confirm'),
          yes: this.translate.instant('delete'),
          no: this.translate.instant('cancel'),
          appearance: 'primary-destructive',
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    );

    if (!confirmed) return;

    this.isUploadingAvatar.set(true);
    try {
      await this.updateProfile({ avatar: null }, null);
      this.toast.success('profile.avatar.delete.success');
      this.supabase.userProfileResource.reload();
    } catch (e) {
      console.error('Error deleting avatar:', e);
      this.toast.error('profile.avatar.delete.error');
    } finally {
      this.isUploadingAvatar.set(false);
    }
  }

  openImport8aDialog(): void {
    this.userProfilesService.openImport8aDialog();
  }

  async onRestartFirstStepsChange(enabled: boolean): Promise<void> {
    if (!enabled) {
      this.updateModel('restartFirstSteps', false);
      return;
    }

    this.updateModel('restartFirstSteps', true);

    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('firstSteps.restart'),
        size: 'm',
        data: {
          content: this.translate.instant('firstSteps.restartConfirm'),
          yes: this.translate.instant('accept'),
          no: this.translate.instant('cancel'),
        },
      }),
      { defaultValue: false },
    );

    if (confirmed) {
      this.hasOpenedWelcome = false;
      await this.updateProfile(
        { first_steps: true },
        'profile.updated.first_steps',
      );
    }

    this.updateModel('restartFirstSteps', false);
  }

  async onMessageSoundChange(enabled: boolean): Promise<void> {
    this.updateModel('messageSound', enabled);
    await this.updateProfile(
      { message_sound: enabled },
      'profile.updated.message_sound',
    );
    this.audioPrefs.messageSoundEnabled.set(enabled);
  }

  async onNotificationSoundChange(enabled: boolean): Promise<void> {
    this.updateModel('notificationSound', enabled);
    await this.updateProfile(
      { notification_sound: enabled },
      'profile.updated.notification_sound',
    );
    this.audioPrefs.notificationSoundEnabled.set(enabled);
  }

  async onEditingModeChange(enabled: boolean): Promise<void> {
    if (enabled) {
      const confirmed = await this.toggleEditingMode(true);
      if (confirmed) {
        this.updateModel('editingMode', true);
        await this.updateProfile(
          { editing_mode: true },
          'profile.updated.editing_mode',
        );
      } else {
        this.updateModel('editingMode', false);
      }
    } else {
      this.updateModel('editingMode', false);
      this.authState.editingMode.set(false);
      await this.updateProfile(
        { editing_mode: false },
        'profile.updated.editing_mode',
      );
    }
  }

  onPrivateProfileChange(enabled: boolean): void {
    this.updateModel('isPrivate', enabled);
    void this.togglePrivateProfile(enabled);
  }

  private async updateProfile(
    updates: Partial<UserProfileDto>,
    toastKey: string | null = 'profile.saveSuccess',
  ): Promise<void> {
    const result = await this.userProfilesService.updateUserProfile(updates);

    if (!result.success) {
      console.error('Error saving profile:', result.error);
      this.toast.error('profile.saveError');
    } else if (toastKey) {
      this.pendingSuccessToast.set({
        key: toastKey,
        lang: updates.language || this.languageService.selectedLanguage(),
      });
    }
  }

  async toggleEditingMode(enabled: boolean): Promise<boolean> {
    if (this.authState.editingMode() === enabled) {
      return true;
    }

    if (enabled && !this.authState.isAdmin()) {
      const hasPermissions = this.authState.isAreaAdmin();
      const messageKey = hasPermissions
        ? 'profile.editing.confirmationEquipper'
        : 'profile.editing.confirmationUser';

      const confirmed = await firstValueFrom(
        this.dialogs.open<boolean>(TUI_CONFIRM, {
          label: this.translate.instant('profile.editing.confirmationTitle'),
          size: 'm',
          data: {
            content: this.translate.instant(messageKey),
            yes: this.translate.instant('accept'),
            no: this.translate.instant('cancel'),
          } as TuiConfirmData,
        }),
        { defaultValue: false },
      );

      if (!confirmed) {
        this.updateModel('editingMode', false);
        this.authState.editingMode.set(false);
        return false;
      }
    }

    this.authState.editingMode.set(enabled);
    return true;
  }

  async logout(): Promise<void> {
    if (!this.isBrowser) return;
    this.close();
    await this.supabase.logout();
  }

  deleteAccount(template: PolymorpheusContent<TuiDialogContext<void>>): void {
    this.model.update((m) => ({ ...m, deleteEmail: '' }));
    void firstValueFrom(
      this.dialogs.open(template, {
        size: 'm',
      }),
      { defaultValue: undefined },
    );
  }

  protected openFollowRequestsDialog(): void {
    void firstValueFrom(
      this.dialogs.open(
        new PolymorpheusComponent(FollowRequestsDialogComponent),
        {
          label: this.translate.instant('followRequests'),
          size: 'm',
        },
      ),
      { defaultValue: undefined },
    );
  }

  openPurchaseHistoryDialog(): void {
    this.merchService.openPurchaseHistory();
  }

  async confirmDeleteAccount(observer: Observer<void>): Promise<void> {
    if (this.profileForm.deleteEmail().value() !== this.userEmail()) {
      return;
    }
    observer.complete();
    try {
      await this.supabase.deleteAccount();
      this.toast.success('profile.deleteAccount.success');
      this.close();
    } catch (e) {
      console.error('Error deleting account:', e);
      this.toast.error('errors.unexpected');
    }
  }

  protected openChangePasswordDialog(
    template: PolymorpheusContent<TuiDialogContext<void>>,
  ): void {
    this.passwordModel.set({ newPassword: '', confirmPassword: '' });
    void firstValueFrom(
      this.dialogs.open(template, {
        size: 'm',
      }),
      { defaultValue: undefined },
    );
  }

  protected readonly passwordModel = signal({
    newPassword: '',
    confirmPassword: '',
  });
  protected isUpdatingPassword = signal(false);

  protected updatePasswordModel(
    key: 'newPassword' | 'confirmPassword',
    value: string,
  ): void {
    this.passwordModel.update((m) => ({ ...m, [key]: value }));
  }

  protected readonly passwordError = computed(() => {
    const { newPassword, confirmPassword } = this.passwordModel();
    if (!newPassword && !confirmPassword) return null;
    if (newPassword.length > 0 && !isComplexPassword(newPassword)) {
      return this.translate.instant('auth.passwordRequirements', { min: 6 });
    }
    if (confirmPassword.length > 0 && newPassword !== confirmPassword) {
      return this.translate.instant('errors.passwordMismatch');
    }
    return null;
  });

  async confirmChangePassword(observer: Observer<void>): Promise<void> {
    const { newPassword, confirmPassword } = this.passwordModel();

    if (
      !newPassword ||
      !isComplexPassword(newPassword) ||
      newPassword !== confirmPassword
    ) {
      return;
    }

    this.isUpdatingPassword.set(true);
    try {
      const { error } = await this.supabase.updatePassword(newPassword);
      if (error) {
        console.error('Error updating password:', error);
        this.toast.error(error.message || 'errors.unexpected');
      } else {
        this.toast.success('auth.passwordUpdated');
        observer.complete();
      }
    } catch (e) {
      console.error('Unexpected error updating password:', e);
      this.toast.error('errors.unexpected');
    } finally {
      this.isUpdatingPassword.set(false);
    }
  }

  close(): void {
    if (this.dialogContext) {
      this.dialogContext.$implicit.complete();
    } else {
      this.location.back();
    }
  }

  startTour(): void {
    void this.tourService.start();
  }
}
