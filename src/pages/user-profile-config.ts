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
import {
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';

import { TuiDay, TuiStringMatcher } from '@taiga-ui/cdk';
import { TuiHeader } from '@taiga-ui/layout';
import {
  TuiButton,
  tuiDateFormatProvider,
  TuiFallbackSrcPipe,
  TuiFlagPipe,
  TuiIcon,
  TuiNotification,
  TuiScrollbar,
  TuiTextfield,
  TuiTitle,
  TuiDropdown,
  TuiError,
  TuiAppearance,
} from '@taiga-ui/core';
import {
  TuiDialogService,
  type TuiDialogContext,
} from '@taiga-ui/experimental';
import { PolymorpheusContent } from '@taiga-ui/polymorpheus';
import {
  TUI_CONFIRM,
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
  TuiPulse,
  type TuiConfirmData,
  TuiFieldErrorPipe,
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
  Observer,
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
  TourService,
  TourStep,
} from '../services';
import { FirstStepsDialogComponent } from '../dialogs/first-steps-dialog';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TourHintComponent } from '../components/tour-hint';

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
    TourHintComponent,
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
    TuiHeader,
    TuiIcon,
    TuiInputDate,
    TuiInputNumber,
    TuiInputYear,
    TuiNotification,
    TuiScrollbar,
    TuiSegmented,
    TuiSelect,
    TuiShimmer,
    TuiSkeleton,
    TuiSwitch,
    TuiTextarea,
    TuiTextfield,
    TuiDropdown,
    TuiPulse,
    TuiTitle,
    TuiError,
    TuiFieldErrorPipe,
    TuiAppearance,
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
                (displayNameControl.invalid ||
                  displayNameControl.value === userEmail())
              "
            >
              <tui-icon icon="@tui.arrow-left" />
              {{
                (isFirstSteps() ? 'firstSteps.next' : 'profile.title')
                  | translate
              }}
            </button>
          </h1>
        </header>

        <!-- Avatar y Nombre -->
        <div class="flex flex-col md:flex-row items-center gap-4">
          <div class="relative inline-block">
            <tui-badged-content
              [style.--tui-radius.%]="50"
              [class.ring-4]="isFirstSteps()"
              [class.ring-primary]="isFirstSteps()"
              class="rounded-full"
            >
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
          <div
            class="w-full relative"
            [tuiDropdown]="tourHint"
            [tuiDropdownManual]="
              tourService.isActive() && tourService.step() === TourStep.WELCOME
            "
            tuiDropdownDirection="bottom"
          >
            <tui-textfield
              class="w-full"
              [tuiTextfieldCleaner]="false"
              [class.ring-2]="
                tourService.isActive() &&
                tourService.step() === TourStep.WELCOME
              "
              [class.ring-primary]="
                tourService.isActive() &&
                tourService.step() === TourStep.WELCOME
              "
            >
              <label tuiLabel for="nameInput">{{
                'labels.userName' | translate
              }}</label>
              <input
                id="nameInput"
                name="nameInput"
                tuiTextfield
                type="text"
                autocomplete="off"
                [formControl]="displayNameControl"
                (blur)="saveName()"
                (keydown.enter)="saveName()"
                [tuiSkeleton]="!userEmail()"
              />
            </tui-textfield>
            <tui-error
              [error]="[] | tuiFieldError | async"
              [formControl]="displayNameControl"
            />
            @if (
              tourService.isActive() && tourService.step() === TourStep.WELCOME
            ) {
              <tui-pulse />
            }
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
          <tui-textfield
            class="w-full"
            [tuiTextfieldCleaner]="false"
            [class.ring-2]="isFirstSteps()"
            [class.ring-primary]="isFirstSteps()"
          >
            <label tuiLabel for="bioInput">{{
              'labels.bio' | translate
            }}</label>
            <textarea
              id="bioInput"
              name="bioInput"
              tuiTextarea
              rows="4"
              maxlength="100"
              [formControl]="bioControl"
              (blur)="saveBio()"
              [tuiSkeleton]="!userEmail()"
            ></textarea>
            <tui-error
              [error]="[] | tuiFieldError | async"
              [formControl]="bioControl"
            />
          </tui-textfield>
        </div>
        <!-- 8a.nu User -->
        <!-- Temporarily hidden
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
        -->
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
                [formControl]="countryControl"
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
                type="text"
                autocomplete="off"
                maxlength="100"
                [formControl]="cityControl"
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
                [max]="today"
                [min]="minBirthDate"
                [formControl]="birthDateControl"
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
                [min]="minYear"
                [max]="currentYear"
                [formControl]="startingClimbingYearControl"
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
                [min]="0"
                [max]="300"
                [formControl]="sizeControl"
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
                id="sexSelect"
                name="sexSelect"
                tuiSelect
                [formControl]="sexControl"
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
            size="s"
            tuiButton
            type="button"
            appearance="action-grayscale"
            (click)="openImport8aDialog()"
          >
            <tui-icon icon="@tui.download" />
            {{ 'import8a.button' | translate }}
          </button>
        </div>
        <!-- Language & Theme -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Left Column: Language & Theme -->
          <div class="flex flex-col gap-6">
            <!-- Language -->
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
                [formControl]="languageControl"
                (ngModelChange)="saveLanguage()"
                [tuiSkeleton]="!userEmail()"
              />
              <tui-data-list-wrapper
                *tuiTextfieldDropdown
                new
                [items]="languages"
              />
            </tui-textfield>

            <!-- Theme -->
            <tui-segmented
              size="l"
              class="w-fit"
              [activeItemIndex]="themeControl.value === Themes.DARK ? 1 : 0"
              (activeItemIndexChange)="toggleTheme($event === 1)"
            >
              <button title="light" type="button">
                <tui-icon icon="@tui.sun" />
              </button>
              <button title="dark" type="button">
                <tui-icon icon="@tui.moon" />
              </button>
            </tui-segmented>
          </div>

          <!-- Right Column: Switches -->
          <div class="flex flex-col items-end gap-4">
            <!-- Switches -->
            <div class="flex items-center gap-4">
              <label tuiLabel for="firstStepsSwitch">{{
                'labels.firstSteps' | translate
              }}</label>
              <input
                id="firstStepsSwitch"
                tuiSwitch
                type="checkbox"
                [ngModel]="false"
                (ngModelChange)="onRestartFirstStepsChange($event)"
              />
            </div>

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
                (ngModelChange)="toggleEditingMode($event)"
              />
            </div>

            <div class="flex items-center gap-4">
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
            </div>
          </div>
        </div>

        <br />

        <!-- Account Actions -->
        <div
          class="flex flex-col sm:flex-row items-center sm:justify-center gap-4 mt-8 border-t border-[var(--tui-border-normal)] pt-8"
        >
          <button
            tuiButton
            appearance="secondary"
            type="button"
            size="m"
            class="w-full sm:w-auto"
            (click)="logout()"
          >
            {{ 'auth.logout' | translate }}
          </button>

          <button
            tuiButton
            appearance="flat-destructive"
            type="button"
            size="m"
            class="w-full sm:w-auto"
            (click)="deleteAccount(deleteDialog)"
          >
            {{ 'profile.deleteAccount.button' | translate }}
          </button>
        </div>
      </section>
    </tui-scrollbar>

    <ng-template #deleteDialog let-observer>
      <div class="flex flex-col gap-4">
        <h3 tuiTitle>{{ 'profile.deleteAccount.title' | translate }}</h3>
        <p class="text-[var(--tui-text-negative)] font-bold">
          {{ 'profile.deleteAccount.warning' | translate }}
        </p>
        <p
          [innerHTML]="
            'profile.deleteAccount.instruction'
              | translate: { email: userEmail() }
          "
        ></p>

        <tui-textfield>
          <input
            tuiTextfield
            [formControl]="deleteEmailControl"
            (paste)="$event.preventDefault()"
            autocomplete="off"
            placeholder="email@example.com"
          />
        </tui-textfield>

        <div class="flex justify-end gap-2">
          <button
            tuiButton
            appearance="secondary"
            (click)="observer.complete()"
          >
            {{ 'actions.cancel' | translate }}
          </button>
          <button
            tuiButton
            appearance="primary"
            [disabled]="deleteEmailControl.value !== userEmail()"
            (click)="confirmDeleteAccount(observer)"
          >
            {{ 'profile.deleteAccount.button' | translate }}
          </button>
        </div>
      </div>
    </ng-template>
    <ng-template #tourHint>
      <app-tour-hint
        [description]="'tour.config.description' | translate"
        (next)="tourService.next()"
        [disabled]="
          displayNameControl.invalid || displayNameControl.value === userEmail()
        "
      />
    </ng-template>
  `,
})
export class UserProfileConfigComponent {
  protected readonly global = inject(GlobalData);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);
  private readonly userProfilesService = inject(UserProfilesService);
  protected readonly tourService = inject(TourService);
  protected readonly TourStep = TourStep;
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
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
  displayNameControl = new FormControl('', [
    Validators.required,
    Validators.minLength(3),
    Validators.maxLength(50),
  ]);
  bioControl = new FormControl('', [Validators.maxLength(100)]);
  languageControl = new FormControl<Language>(Languages.ES);
  themeControl = new FormControl<Theme>(Themes.LIGHT);
  countryControl = new FormControl<string | null>(null);
  cityControl = new FormControl<string | null>(null, [
    Validators.maxLength(100),
  ]);
  birthDateControl = new FormControl<TuiDay | null>(null);
  startingClimbingYearControl = new FormControl<number | null>(null, [
    Validators.min(1900),
    Validators.max(new Date().getFullYear()),
  ]);
  sizeControl = new FormControl<number | null>(null, [
    Validators.min(0),
    Validators.max(300),
  ]);
  sexControl = new FormControl<Sex | null>(null);
  isPrivate = false;

  deleteEmailControl = new FormControl('');

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

    effect(() => {
      // isFirstSteps() can be true because it's calculated from the profile.
      // We only show the welcome dialog if we haven't already and the tour isn't active.
      if (
        this.isFirstSteps() &&
        !this.hasOpenedWelcome &&
        this.tourService.step() === TourStep.OFF &&
        isPlatformBrowser(this.platformId)
      ) {
        // Double check with latest profile data or force a check if needed,
        // but currently isFirstSteps() relies on computed signal.
        // We set hasOpenedWelcome to true immediately to prevent double opening.
        this.hasOpenedWelcome = true;

        if (!this.isFirstSteps()) return;
        this.openWelcomeDialog();
      }
    });
  }

  private openWelcomeDialog(): void {
    this.dialogs
      .open(new PolymorpheusComponent(FirstStepsDialogComponent), {
        size: 'm',
        dismissible: false,
        closable: false,
      })
      .subscribe();
  }

  async loadProfile(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const profile = this.profile();
    if (!profile) return;

    const name = profile.name || '';
    this.displayNameControl.setValue(name);

    if (
      this.displayNameControl.value === this.userEmail() &&
      this.displayNameControl.value
    ) {
      this.displayNameControl.setValue('');
      this.displayNameControl.markAsTouched();
      this.displayNameControl.markAsDirty();
    }
    this.bioControl.setValue(profile.bio || '');
    this.languageControl.setValue(
      (profile.language as Language) || Languages.ES,
    );
    this.themeControl.setValue((profile.theme as Theme) || Themes.LIGHT);
    this.countryControl.setValue(
      profile.country || (this.isFirstSteps() ? 'ES' : null),
    );
    this.cityControl.setValue(profile.city || null);
    this.sexControl.setValue((profile.sex as Sex) || null);
    this.sizeControl.setValue(profile.size || null);
    this.startingClimbingYearControl.setValue(
      profile.starting_climbing_year || null,
    );
    this.isPrivate = !!profile.private;

    if (profile.birth_date) {
      const date = new Date(profile.birth_date);
      this.birthDateControl.setValue(
        new TuiDay(date.getFullYear(), date.getMonth(), date.getDate()),
      );
    }
  }

  async togglePrivateProfile(isPrivate: boolean): Promise<void> {
    if (this.isPrivate === isPrivate) {
      return;
    }

    if (isPrivate) {
      const confirmed = await firstValueFrom(
        this.dialogs.open<boolean>(TUI_CONFIRM, {
          label: this.translate.instant('labels.privateProfile'),
          size: 'm',
          data: {
            content: this.translate.instant('profile.private.confirmation'),
            yes: this.translate.instant('actions.accept'),
            no: this.translate.instant('actions.cancel'),
          },
        }),
        { defaultValue: false },
      );

      if (!confirmed) {
        this.isPrivate = false;
        return;
      }
    }

    this.isPrivate = isPrivate;
    await this.updateProfile({ private: this.isPrivate });
  }

  async saveName(): Promise<void> {
    const val = this.displayNameControl.value || '';
    const trimmed = val.trim();
    if (!trimmed) {
      const current = this.profile();
      this.displayNameControl.setValue(current?.name ?? '');
      this.toast.info('profile.name.required');
      return;
    }
    if (trimmed.length < 3 || trimmed.length > 50) {
      // Restore previous valid value for UX consistency
      const current = this.profile();
      this.displayNameControl.setValue(current?.name ?? '');
      this.toast.info('profile.name.length');
      return;
    }
    if (trimmed === (this.profile()?.name ?? '')) {
      return;
    }
    await this.updateProfile({ name: trimmed });
  }

  async saveBio(): Promise<void> {
    if (this.bioControl.invalid) {
      this.toast.info('profile.bio.tooLong');
      return;
    }
    const val = this.bioControl.value || '';
    const trimmed = val.trim();
    const current = this.profile();

    if (trimmed === (current?.bio ?? '')) {
      this.bioControl.setValue(current?.bio ?? '');
      return;
    }
    await this.updateProfile({ bio: trimmed });
  }

  async toggleTheme(isDark: boolean): Promise<void> {
    const newTheme = isDark ? Themes.DARK : Themes.LIGHT;
    if (this.themeControl.value === newTheme) {
      return;
    }
    this.themeControl.setValue(newTheme);
    await this.updateProfile({ theme: newTheme });
  }

  async saveLanguage(): Promise<void> {
    const current = this.profile();
    if (this.languageControl.value === (current?.language ?? null)) {
      return;
    }
    await this.updateProfile({ language: this.languageControl.value });
  }

  async saveCountry(): Promise<void> {
    const current = this.profile();
    // Ensure selected country is valid or null
    const validIds = new Set(this.countryIds());
    const val = this.countryControl.value;
    if (val && !validIds.has(val)) {
      this.countryControl.setValue(current?.country ?? null);
      this.toast.error('profile.country.invalid');
      return;
    }
    if (val === (current?.country ?? null)) {
      return;
    }
    await this.updateProfile({ country: val });
  }

  async saveCity(): Promise<void> {
    if (this.cityControl.invalid) {
      this.toast.info('profile.city.tooLong');
      return;
    }
    const val = this.cityControl.value;
    const current = this.profile();
    if (val === (current?.city ?? null)) {
      return;
    }
    await this.updateProfile({ city: val });
  }

  async saveBirthDate(): Promise<void> {
    const current = this.profile();
    const currentDate = current?.birth_date
      ? new Date(current.birth_date).toISOString().split('T')[0]
      : null;
    const bd = this.birthDateControl.value;
    const newDate = bd
      ? `${bd.year}-${String(bd.month + 1).padStart(2, '0')}-${String(bd.day).padStart(2, '0')}`
      : null;
    if (bd) {
      // Reject future dates or dates before minBirthDate
      if (bd.dayBefore(this.minBirthDate) || this.today.dayBefore(bd)) {
        this.birthDateControl.setValue(
          current?.birth_date
            ? new TuiDay(
                new Date(current.birth_date).getFullYear(),
                new Date(current.birth_date).getMonth(),
                new Date(current.birth_date).getDate(),
              )
            : null,
        );
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
    if (this.startingClimbingYearControl.invalid) {
      this.startingClimbingYearControl.setValue(
        current?.starting_climbing_year ?? null,
      );
      this.toast.error('profile.startingYear.invalid');
      return;
    }
    const newYear = this.startingClimbingYearControl.value;
    if (newYear === (current?.starting_climbing_year ?? null)) {
      return;
    }
    await this.updateProfile({ starting_climbing_year: newYear });
  }

  async saveSize(): Promise<void> {
    const current = this.profile();
    if (this.sizeControl.invalid) {
      this.sizeControl.setValue(current?.size ?? null);
      this.toast.error('profile.size.invalid');
      return;
    }
    const val = this.sizeControl.value;
    if (val === (current?.size ?? null)) {
      return;
    }
    await this.updateProfile({ size: val });
  }

  async saveSex(): Promise<void> {
    const current = this.profile();
    const val = this.sexControl.value;
    if (val === (current?.sex ?? null)) {
      return;
    }
    await this.updateProfile({ sex: val });
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

    // Trigger file selection
    input.click();
  }

  openImport8aDialog(): void {
    this.userProfilesService.openImport8aDialog();
  }

  async onRestartFirstStepsChange(enabled: boolean): Promise<void> {
    if (!enabled) return;

    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('firstSteps.restart'),
        size: 'm',
        data: {
          content: this.translate.instant('firstSteps.restartConfirm'),
          yes: this.translate.instant('actions.accept'),
          no: this.translate.instant('actions.cancel'),
        },
      }),
      { defaultValue: false },
    );

    if (confirmed) {
      this.hasOpenedWelcome = false;
      await this.updateProfile({ first_steps: true });
      this.openWelcomeDialog();
    }
  }

  private async updateProfile(updates: Partial<UserProfileDto>): Promise<void> {
    const result = await this.userProfilesService.updateUserProfile(updates);

    if (!result.success) {
      console.error('Error saving profile:', result.error);
      this.toast.error('Error: ' + result.error);
    }
  }

  async toggleEditingMode(enabled: boolean): Promise<void> {
    if (this.global.editingMode() === enabled) {
      return;
    }

    if (enabled && !this.global.isActualAdmin()) {
      const isEquipper = this.global.isActualEquipper();
      const messageKey = isEquipper
        ? 'profile.editing.confirmationEquipper'
        : 'profile.editing.confirmationUser';

      const confirmed = await firstValueFrom(
        this.dialogs.open<boolean>(TUI_CONFIRM, {
          label: this.translate.instant('profile.editing.confirmationTitle'),
          size: 'm',
          data: {
            content: this.translate.instant(messageKey),
            yes: this.translate.instant('actions.accept'),
            no: this.translate.instant('actions.cancel'),
          } as TuiConfirmData,
        }),
        { defaultValue: false },
      );

      if (!confirmed) {
        // Force the switch to stay false
        this.global.editingMode.set(false);
        return;
      }
    }

    this.global.editingMode.set(enabled);
  }

  async logout(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    this.close();
    await this.supabase.logout();
  }

  deleteAccount(template: PolymorpheusContent<TuiDialogContext<void>>): void {
    this.deleteEmailControl.reset();
    this.dialogs
      .open(template, {
        size: 'm',
      })
      .subscribe();
  }

  async confirmDeleteAccount(observer: Observer<void>): Promise<void> {
    if (this.deleteEmailControl.value !== this.userEmail()) {
      return;
    }
    observer.complete();
    try {
      await this.supabase.deleteAccount();
      this.toast.success('profile.deleteAccount.success');
      this.close();
    } catch (e) {
      console.error('Error deleting account:', e);
      this.toast.error('Error deleting account');
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
