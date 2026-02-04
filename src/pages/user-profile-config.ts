import {
  AsyncPipe,
  isPlatformBrowser,
  Location,
  NgOptimizedImage,
} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  PLATFORM_ID,
  resource,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { TuiDay, TuiStringMatcher } from '@taiga-ui/cdk';
import {
  TuiButton,
  tuiDateFormatProvider,
  TuiFallbackSrcPipe,
  TuiFlagPipe,
  TuiHint,
  TuiIcon,
  TuiLoader,
  TuiNotification,
  TuiScrollbar,
  TuiTextfield,
  TuiTitle,
} from '@taiga-ui/core';
import { type TuiDialogContext } from '@taiga-ui/experimental';
import {
  TUI_COUNTRIES,
  TuiAvatar,
  TuiBadge,
  TuiBadgedContentComponent,
  TuiChevron,
  TuiComboBox,
  TuiDataListWrapper,
  TuiFilterByInputPipe,
  TuiInputDate,
  TuiInputNumber,
  TuiInputYear,
  TuiSegmented,
  TuiSelect,
  TuiShimmer,
  TuiSkeleton,
  TuiSwitch,
  TuiTextarea,
} from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  debounceTime,
  filter,
  firstValueFrom,
  map,
  of,
  Subject,
  switchMap,
  tap,
} from 'rxjs';

import {
  EightAnuUser,
  Language,
  Languages,
  Sex,
  Sexes,
  Theme,
  Themes,
  UserProfileDto,
} from '../models';

import {
  GlobalData,
  SupabaseService,
  ToastService,
  UserProfilesService,
  EightAnuService,
} from '../services';

interface Country {
  id: string;
  name: string;
}

@Component({
  selector: 'app-user-profile-config',
  imports: [
    AsyncPipe,
    FormsModule,
    NgOptimizedImage,
    ReactiveFormsModule,
    TranslatePipe,
    TuiAvatar,
    TuiBadge,
    TuiBadgedContentComponent,
    TuiButton,
    TuiChevron,
    TuiComboBox,
    TuiDataListWrapper,
    TuiFallbackSrcPipe,
    TuiFilterByInputPipe,
    TuiFlagPipe,
    TuiHint,
    TuiIcon,
    TuiInputDate,
    TuiInputNumber,
    TuiInputYear,
    TuiLoader,
    TuiNotification,
    TuiScrollbar,
    TuiSegmented,
    TuiSelect,
    TuiShimmer,
    TuiSkeleton,
    TuiSwitch,
    TuiTextarea,
    TuiTextfield,
    TuiTitle,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [tuiDateFormatProvider({ mode: 'DMY', separator: '/' })],
  host: { class: 'flex grow min-h-0' },
  template: `
    <tui-scrollbar class="flex grow">
      <section
        class="w-full max-w-5xl mx-auto p-4 grid grid-cols-1 gap-4 pb-32"
      >
        <!-- Sticky Header -->
        <div
          class="sticky top-0 z-10 flex items-center gap-4 p-4 -mt-4 -mx-4 mb-4 bg-[var(--tui-background-base)] shadow-md sm:shadow-none"
        >
          <button
            size="s"
            appearance="neutral"
            iconStart="@tui.chevron-left"
            tuiIconButton
            type="button"
            class="!rounded-full"
            [tuiHint]="global.isMobile() ? null : ('actions.back' | translate)"
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
              @if (userEmail()) {
                <tui-icon icon="@tui.upload" tuiSlot="top" tuiBadge />
              }
              <tui-avatar
                (mouseenter)="avatarHovered.set(true)"
                (mouseleave)="avatarHovered.set(false)"
                (click)="!isUploadingAvatar() && uploadAvatar()"
                (keydown.enter)="!isUploadingAvatar() && uploadAvatar()"
                tabindex="0"
                class="cursor-pointer"
                size="xxl"
                [src]="avatarSrc() | tuiFallbackSrc: '@tui.user' | async"
                [tuiShimmer]="isUploadingAvatar()"
                [tuiSkeleton]="!userEmail()"
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
                name="nameInput"
                tuiTextfield
                type="text"
                autocomplete="off"
                required
                minlength="3"
                maxlength="50"
                [(ngModel)]="displayName"
                (blur)="saveName()"
                (keydown.enter)="saveName()"
                [tuiSkeleton]="!userEmail()"
              />
            </tui-textfield>
            @if (nameEqualsEmail()) {
              <tui-notification appearance="warning" class="mt-2">
                <h3 tuiTitle>
                  {{ 'profile.name.equalsEmail' | translate }}
                </h3>
              </tui-notification>
            }
          </div>
        </div>
        <!-- Email (readonly) -->
        <div>
          <tui-textfield class="w-full" [tuiTextfieldCleaner]="false">
            <label tuiLabel for="emailInput">{{
              'labels.email' | translate
            }}</label>
            <input
              id="emailInput"
              tuiTextfield
              type="email"
              autocomplete="off"
              [value]="userEmail()"
              readonly
              disabled
              [tuiSkeleton]="!userEmail()"
            />
          </tui-textfield>
        </div>
        <!-- Bio -->
        <div>
          <tui-textfield class="w-full" [tuiTextfieldCleaner]="false">
            <label tuiLabel for="bioInput">{{
              'labels.bio' | translate
            }}</label>
            <textarea
              id="bioInput"
              name="bioInput"
              tuiTextarea
              rows="4"
              maxlength="50"
              [(ngModel)]="bio"
              (blur)="saveBio()"
              [tuiSkeleton]="!userEmail()"
            ></textarea>
          </tui-textfield>
        </div>
        <!-- 8a.nu User -->
        <div class="flex items-center gap-4">
          @if (selectedEightAnuUser.value(); as user) {
            <tui-avatar size="l" [src]="user.avatar" />
          }

          @let items = eightAnuResults();
          <tui-textfield
            class="w-full"
            [tuiTextfieldCleaner]="true"
            [stringify]="stringifyEightAnuUser"
          >
            <label tuiLabel for="eightAnuSearch">{{
              'labels.eightAnuUser' | translate
            }}</label>
            <input
              #eightAnuInput
              id="eightAnuSearch"
              name="eightAnuSearch"
              tuiComboBox
              autocomplete="off"
              [ngModel]="selectedEightAnuUser.value()"
              (ngModelChange)="saveEightAnuUser($event)"
              (input)="eightAnuSearch$.next($any($event.target).value)"
              [tuiSkeleton]="!userEmail()"
            />
            <tui-data-list-wrapper
              *tuiTextfieldDropdown
              new
              [emptyContent]="
                eightAnuInput.value.length < 3
                  ? ('import8a.minChars' | translate)
                  : ('notFound.title' | translate)
              "
              [itemContent]="eightAnuItem"
              [items]="eightAnuInput.value.length < 3 ? [] : items || []"
            />
            <ng-template #eightAnuItem let-item>
              <div class="flex items-center gap-2">
                <tui-avatar size="s" [src]="item.avatar" />
                <span>{{ item.userName }}</span>
              </div>
            </ng-template>
            @if (items && eightAnuShowLoader()) {
              <tui-loader />
            }
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
                name="countrySelect"
                tuiComboBox
                autocomplete="off"
                [(ngModel)]="country"
                [matcher]="matcher"
                [strict]="true"
                (ngModelChange)="saveCountry()"
                [tuiSkeleton]="!userEmail()"
              />
              <tui-data-list-wrapper
                *tuiTextfieldDropdown
                new
                [items]="countryIds() | tuiFilterByInput"
                [itemContent]="countryItem"
              />
              <ng-template #countryItem let-item>
                <img
                  [ngSrc]="item | tuiFlag"
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
                name="cityInput"
                tuiTextfield
                type="text"
                autocomplete="off"
                maxlength="100"
                [(ngModel)]="city"
                (blur)="saveCity()"
                (keydown.enter)="saveCity()"
                [tuiSkeleton]="!userEmail()"
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
                name="birthDateInput"
                tuiInputDate
                [max]="today"
                [min]="minBirthDate"
                [(ngModel)]="birthDate"
                (ngModelChange)="saveBirthDate()"
                [tuiSkeleton]="!userEmail()"
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
                name="startingClimbingYearInput"
                tuiInputYear
                [min]="minYear"
                [max]="currentYear"
                [(ngModel)]="startingClimbingYear"
                (ngModelChange)="saveStartingClimbingYear()"
                [tuiSkeleton]="!userEmail()"
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
                name="sizeInput"
                tuiInputNumber
                [min]="0"
                [max]="300"
                [(ngModel)]="size"
                (blur)="saveSize()"
                (keydown.enter)="saveSize()"
                [tuiSkeleton]="!userEmail()"
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
                name="sexSelect"
                tuiSelect
                [(ngModel)]="sex"
                (ngModelChange)="saveSex()"
                [tuiSkeleton]="!userEmail()"
              />
              <tui-data-list-wrapper
                *tuiTextfieldDropdown
                new
                [items]="sexes"
              />
            </tui-textfield>
          </div>
        </div>

        <br />

        <!-- PREFERENCES -->
        <div class="flex items-center justify-between gap-4">
          <h2 class="text-lg font-bold m-0">
            {{ 'labels.preferences' | translate }}
          </h2>
          <button
            iconStart="@tui.download"
            size="s"
            tuiButton
            type="button"
            appearance="action-grayscale"
            (click)="openImport8aDialog()"
          >
            {{ 'import8a.button' | translate }}
          </button>
        </div>
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
                name="languageSelect"
                tuiSelect
                [(ngModel)]="language"
                (ngModelChange)="saveLanguage()"
                [tuiSkeleton]="!userEmail()"
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
            <tui-segmented
              [activeItemIndex]="theme === Themes.DARK ? 1 : 0"
              (activeItemIndexChange)="toggleTheme($event === 1)"
            >
              <button title="light" type="button">
                <tui-icon icon="@tui.sun" />
              </button>
              <button title="dark" type="button">
                <tui-icon icon="@tui.moon" />
              </button>
            </tui-segmented>

            <div class="flex items-center gap-4">
              <label tuiLabel for="msgSoundUtil">{{
                'labels.messageSound' | translate
              }}</label>
              <input
                id="msgSoundUtil"
                tuiSwitch
                type="checkbox"
                [ngModel]="global.messageSoundEnabled()"
                (ngModelChange)="global.messageSoundEnabled.set($event)"
              />
            </div>

            <div class="flex items-center gap-4">
              <label tuiLabel for="notifSoundUtil">{{
                'labels.notificationSound' | translate
              }}</label>
              <input
                id="notifSoundUtil"
                tuiSwitch
                type="checkbox"
                [ngModel]="global.notificationSoundEnabled()"
                (ngModelChange)="global.notificationSoundEnabled.set($event)"
              />
            </div>

            @if (global.isUserAdminOrEquipper()) {
              <div class="flex items-center gap-4">
                <label tuiLabel for="editingSwitch">{{
                  'labels.editingMode' | translate
                }}</label>
                <input
                  id="editingSwitch"
                  name="editingSwitch"
                  tuiSwitch
                  type="checkbox"
                  [ngModel]="global.editingMode()"
                  (ngModelChange)="global.editingMode.set($event)"
                />
              </div>
            }

            <!-- <div class="flex items-center gap-4">
            <label tuiLabel for="privateSwitch">{{
              'labels.privateProfile' | translate
            }}</label>
            <input
              id="privateSwitch"
              name="privateSwitch"
              tuiSwitch
              type="checkbox"
              [ngModel]="isPrivate"
              (ngModelChange)="togglePrivateProfile($event)"
            />
          </div> -->
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
    </tui-scrollbar>
  `,
})
export class UserProfileConfigComponent {
  protected readonly global = inject(GlobalData);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);
  private readonly userProfilesService = inject(UserProfilesService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly dialogContext: TuiDialogContext<unknown, unknown> | null =
    (() => {
      try {
        return injectContext<TuiDialogContext<unknown, unknown>>();
      } catch {
        return null;
      }
    })();

  protected readonly profile = computed(() => this.global.userProfile());
  protected readonly eightAnuService = inject(EightAnuService);

  protected readonly eightAnuShowLoader = signal(false);
  protected readonly eightAnuSearch$ = new Subject<string>();
  protected readonly eightAnuResults = toSignal(
    this.eightAnuSearch$.pipe(
      debounceTime(0),
      filter(() => !this.selectedEightAnuUser.value()),
      tap(() => this.eightAnuShowLoader.set(true)),
      debounceTime(300),
      switchMap((query) =>
        query.length >= 3
          ? this.eightAnuService
              .searchUsers(query)
              .pipe(map((res) => res.items))
          : of([]),
      ),
      tap(() => this.eightAnuShowLoader.set(false)),
    ),
  );

  readonly selectedEightAnuUser = resource<EightAnuUser | null, string | null>({
    params: () => this.profile()?.['8anu_user_slug'] || null,
    loader: async ({ params: slug }) => {
      if (!slug) return null;
      const res = await firstValueFrom(
        this.eightAnuService.getUserBySlug(slug),
      );
      return res.items.find((u) => u.userSlug === slug) || null;
    },
  });
  protected readonly userEmail = computed(
    () => this.supabase.authUser()?.email ?? '',
  );
  protected readonly nameEqualsEmail = computed(() => {
    const profile = this.profile();
    const email = this.userEmail();
    return profile?.name === email && email !== '';
  });
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

  stringifyEightAnuUser = (user: EightAnuUser | null): string =>
    user?.userName || '';

  constructor() {
    effect(() => {
      const userProfile = this.profile();
      if (userProfile) void this.loadProfile();
    });
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
      this.toast.info('profile.name.required');
      return;
    }
    if (trimmed.length < 3 || trimmed.length > 50) {
      // Restore previous valid value for UX consistency
      const current = this.profile();
      this.displayName = current?.name ?? '';
      this.toast.info('profile.name.length');
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
      this.toast.info('profile.bio.tooLong');
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
      this.toast.error('profile.country.invalid');
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
      this.toast.info('profile.city.tooLong');
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
        this.toast.error('profile.birthDate.invalid');
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
        this.toast.error('profile.startingYear.invalid');
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
        this.toast.error('profile.size.invalid');
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

  async saveEightAnuUser(user: unknown): Promise<void> {
    const eightAnuUser = user as EightAnuUser | null;
    await this.updateProfile({
      '8anu_user_slug': eightAnuUser?.userSlug || null,
    });
    void this.selectedEightAnuUser.reload();
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
        this.toast.error('profile.avatar.upload.invalidType');
        return;
      }

      // Validate file size (e.g., max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        console.error('File size must be less than 5MB');
        this.toast.error('profile.avatar.upload.tooLarge');
        return;
      }

      // Open the cropper dialog and wait for confirmation
      const result = await firstValueFrom(
        this.userProfilesService.openAvatarCropper(file, 512),
      );

      if (!result) return; // canceled
      const croppedFile = new File([result.blob], result.fileName, {
        type: result.mimeType,
        lastModified: Date.now(),
      });
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

    // Trigger file selection
    input.click();
  }

  openImport8aDialog(): void {
    this.userProfilesService.openImport8aDialog();
  }

  private async updateProfile(updates: Partial<UserProfileDto>): Promise<void> {
    const result = await this.userProfilesService.updateUserProfile(updates);

    if (!result.success) {
      console.error('Error saving profile:', result.error);
      this.toast.error('Error: ' + result.error);
    }
  }

  async logout(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    this.close();
    await this.supabase.logout();
  }

  close(): void {
    if (this.dialogContext) {
      this.dialogContext.$implicit.complete();
    } else {
      this.location.back();
    }
  }
}
