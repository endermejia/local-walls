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
  form,
  required,
  minLength,
  maxLength,
  min,
  max,
} from '@angular/forms/signals';
import { FormsModule } from '@angular/forms';

import { TuiDay, TuiStringMatcher } from '@taiga-ui/cdk';
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
  TuiCalendar,
  TuiCalendarYear,
} from '@taiga-ui/core';
import {
  TuiDialogService,
  type TuiDialogContext,
} from '@taiga-ui/experimental';
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
} from '@taiga-ui/kit';
import { TuiHeader } from '@taiga-ui/layout';
import { PolymorpheusContent } from '@taiga-ui/polymorpheus';
import { injectContext } from '@taiga-ui/polymorpheus';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

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

import { EightAnuService } from '../services/eight-anu.service';
import { GlobalData } from '../services/global-data';
import { SupabaseService } from '../services/supabase.service';
import { ToastService } from '../services/toast.service';
import { TourService } from '../services/tour.service';
import { TourStep } from '../services/tour.service';
import { UserProfilesService } from '../services/user-profiles.service';

import { TourHintComponent } from '../components/tour-hint';

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

import { FirstStepsDialogComponent } from '../dialogs/first-steps-dialog';

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
    TuiCalendar,
    TuiCalendarYear,
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
                (profileForm.name().invalid() ||
                  profileForm.name().value() === userEmail())
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
                'userName' | translate
              }}</label>
              <input
                id="nameInput"
                tuiTextfield
                type="text"
                autocomplete="off"
                [ngModel]="model().name"
                (ngModelChange)="updateModel('name', $event)"
                [invalid]="
                  !!profile() &&
                  profileForm.name().invalid() &&
                  profileForm.name().touched()
                "
                [disabled]="profileForm.name().disabled()"
                (blur)="saveName()"
                (keydown.enter)="saveName()"
                [tuiSkeleton]="!userEmail()"
              />
            </tui-textfield>
            <tui-error [error]="getFieldError('name')" />
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
            <label tuiLabel for="emailInput">{{ 'email' | translate }}</label>
            <input
              tuiTextfield
              type="email"
              autocomplete="off"
              [ngModel]="userEmail()"
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
            <label tuiLabel for="bioInput">{{ 'bio' | translate }}</label>
            <textarea
              id="bioInput"
              tuiTextarea
              [rows]="4"
              [ngModel]="model().bio"
              (ngModelChange)="updateModel('bio', $event)"
              [invalid]="
                profileForm.bio().invalid() && profileForm.bio().touched()
              "
              [disabled]="profileForm.bio().disabled()"
              (blur)="saveBio()"
              [tuiSkeleton]="!userEmail()"
            ></textarea>
          </tui-textfield>
          <tui-error [error]="getFieldError('bio')" />
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
              'eightAnuUser' | translate
            }}</label>
            <input
              #eightAnuInput
              id="eightAnuSearch"
              tuiComboBox
              autocomplete="off"
              [ngModel]="model().eightAnuUser"
              (ngModelChange)="updateModel('eightAnuUser', $event)"
              [invalid]="profileForm.eightAnuUser().invalid()"
              [disabled]="profileForm.eightAnuUser().disabled()"
              (change)="saveEightAnuUser(model().eightAnuUser)"
              (input)="onEightAnuInput($event)"
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
                'country' | translate
              }}</label>
              <input
                id="countrySelect"
                tuiComboBox
                autocomplete="off"
                [ngModel]="model().country"
                (ngModelChange)="updateModel('country', $event)"
                [invalid]="
                  profileForm.country().invalid() &&
                  profileForm.country().touched()
                "
                [disabled]="profileForm.country().disabled()"
                [matcher]="matcher"
                [strict]="true"
                (change)="saveCountry()"
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
            <tui-error [error]="getFieldError('country')" />
          </div>
          <!-- City -->
          <div>
            <tui-textfield class="w-full" [tuiTextfieldCleaner]="false">
              <label tuiLabel for="cityInput">{{ 'city' | translate }}</label>
              <input
                id="cityInput"
                tuiTextfield
                type="text"
                autocomplete="off"
                [ngModel]="model().city"
                (ngModelChange)="updateModel('city', $event)"
                [invalid]="
                  profileForm.city().invalid() && profileForm.city().touched()
                "
                [disabled]="profileForm.city().disabled()"
                (blur)="saveCity()"
                (keydown.enter)="saveCity()"
                [tuiSkeleton]="!userEmail()"
              />
            </tui-textfield>
            <tui-error [error]="getFieldError('city')" />
          </div>
        </div>
        <!-- Birth Date & Starting Climbing Year -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Birth Date -->
          <div>
            <tui-textfield
              tuiChevron
              class="w-full"
              [tuiTextfieldCleaner]="false"
            >
              <label tuiLabel for="birthDateInput">{{
                'birthDate' | translate
              }}</label>
              <input
                id="birthDateInput"
                tuiInputDate
                class="w-full"
                [max]="today"
                [min]="minBirthDate"
                [ngModel]="model().birth_date"
                (ngModelChange)="updateModel('birth_date', $event)"
                (blur)="saveBirthDate()"
                (keydown.enter)="saveBirthDate()"
                [invalid]="
                  profileForm.birth_date().invalid() &&
                  profileForm.birth_date().touched()
                "
                [disabled]="profileForm.birth_date().disabled()"
                [tuiSkeleton]="!userEmail()"
                autocomplete="off"
              />
              <tui-calendar *tuiTextfieldDropdown />
            </tui-textfield>
            <tui-error [error]="getFieldError('birth_date')" />
          </div>
          <!-- Starting Climbing Year -->
          <div>
            <tui-textfield
              tuiChevron
              class="w-full"
              [tuiTextfieldCleaner]="false"
            >
              <label tuiLabel for="startingClimbingYearInput">{{
                'startingClimbingYear' | translate
              }}</label>
              <input
                id="startingClimbingYearInput"
                tuiInputYear
                class="w-full"
                [min]="minYear"
                [max]="currentYear"
                [ngModel]="model().starting_climbing_year"
                (ngModelChange)="updateModel('starting_climbing_year', $event)"
                (blur)="saveStartingClimbingYear()"
                (keydown.enter)="saveStartingClimbingYear()"
                [invalid]="
                  profileForm.starting_climbing_year().invalid() &&
                  profileForm.starting_climbing_year().touched()
                "
                [disabled]="profileForm.starting_climbing_year().disabled()"
                [tuiSkeleton]="!userEmail()"
                autocomplete="off"
              />
              <tui-calendar-year
                *tuiTextfieldDropdown
                [value]="model().starting_climbing_year || currentYear"
                (yearClick)="
                  updateModel('starting_climbing_year', $event);
                  saveStartingClimbingYear()
                "
              />
            </tui-textfield>
            <tui-error [error]="getFieldError('starting_climbing_year')" />
          </div>
        </div>
        <!-- Size & Sex -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Size -->
          <div>
            <tui-textfield class="w-full" [tuiTextfieldCleaner]="false">
              <label tuiLabel for="sizeInput">{{ 'size' | translate }}</label>
              <input
                id="sizeInput"
                tuiInputNumber
                [min]="0"
                [max]="300"
                [ngModel]="model().size"
                (ngModelChange)="updateModel('size', $event)"
                [invalid]="
                  profileForm.size().invalid() && profileForm.size().touched()
                "
                [disabled]="profileForm.size().disabled()"
                (blur)="saveSize()"
                (keydown.enter)="saveSize()"
                [tuiSkeleton]="!userEmail()"
                autocomplete="off"
              />
              <span class="tui-textfield__suffix">cm</span>
            </tui-textfield>
            <tui-error [error]="getFieldError('size')" />
          </div>
          <!-- Sex -->
          <div>
            <tui-textfield
              tuiChevron
              class="w-full"
              [tuiTextfieldCleaner]="true"
              [stringify]="stringifySex()"
            >
              <label tuiLabel for="sexSelect">{{ 'sex' | translate }}</label>
              <input
                id="sexSelect"
                tuiSelect
                [ngModel]="model().sex"
                (ngModelChange)="updateModel('sex', $event)"
                [invalid]="
                  profileForm.sex().invalid() && profileForm.sex().touched()
                "
                [disabled]="profileForm.sex().disabled()"
                (change)="saveSex()"
                [tuiSkeleton]="!userEmail()"
                autocomplete="off"
              />
              <tui-data-list-wrapper
                *tuiTextfieldDropdown
                new
                [items]="sexes"
              />
            </tui-textfield>
            <tui-error [error]="getFieldError('sex')" />
          </div>
        </div>

        <br />

        <!-- PREFERENCES -->
        <div class="flex items-center justify-between gap-4">
          <h2 class="text-lg font-bold m-0">
            {{ 'preferences' | translate }}
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
                'language' | translate
              }}</label>
              <input
                id="languageSelect"
                tuiSelect
                [ngModel]="model().language"
                (ngModelChange)="
                  updateModel('language', $event); saveLanguage()
                "
                [invalid]="profileForm.language().invalid()"
                [disabled]="profileForm.language().disabled()"
                [tuiSkeleton]="!userEmail()"
                autocomplete="off"
              />
              <tui-data-list-wrapper
                *tuiTextfieldDropdown
                new
                [items]="languages"
              />
            </tui-textfield>
            <tui-error [error]="getFieldError('language')" />

            <!-- Theme -->
            <tui-segmented
              size="l"
              class="w-fit"
              [activeItemIndex]="
                profileForm.theme().value() === Themes.DARK ? 1 : 0
              "
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
                'firstSteps' | translate
              }}</label>
              <input
                id="firstStepsSwitch"
                tuiSwitch
                type="checkbox"
                [ngModel]="model().restartFirstSteps"
                (ngModelChange)="onRestartFirstStepsChange($event)"
                autocomplete="off"
              />
            </div>

            <div class="flex items-center gap-4">
              <label tuiLabel for="msgSoundUtil">{{
                'messageSound' | translate
              }}</label>
              <input
                id="msgSoundUtil"
                tuiSwitch
                type="checkbox"
                [ngModel]="model().messageSound"
                (ngModelChange)="onMessageSoundChange($event)"
                autocomplete="off"
              />
            </div>

            <div class="flex items-center gap-4">
              <label tuiLabel for="notifSoundUtil">{{
                'notificationSound' | translate
              }}</label>
              <input
                id="notifSoundUtil"
                tuiSwitch
                type="checkbox"
                [ngModel]="model().notificationSound"
                (ngModelChange)="onNotificationSoundChange($event)"
                autocomplete="off"
              />
            </div>

            <div class="flex items-center gap-4">
              <label tuiLabel for="editingSwitch">{{
                'editingMode' | translate
              }}</label>
              <input
                id="editingSwitch"
                tuiSwitch
                type="checkbox"
                [ngModel]="model().editingMode"
                (ngModelChange)="onEditingModeChange($event)"
                autocomplete="off"
              />
            </div>

            <div class="flex items-center gap-4">
              <label tuiLabel for="privateSwitch">{{
                'privateProfile' | translate
              }}</label>
              <input
                id="privateSwitch"
                tuiSwitch
                type="checkbox"
                [ngModel]="model().isPrivate"
                (ngModelChange)="onPrivateProfileChange($event)"
                autocomplete="off"
              />
            </div>
          </div>
        </div>

        <br />

        <!-- Account Actions -->
        <div
          class="flex flex-col sm:flex-row items-center sm:justify-between gap-4 mt-8 border-t border-[var(--tui-border-normal)] pt-8"
        >
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
            [ngModel]="model().deleteEmail"
            (ngModelChange)="updateModel('deleteEmail', $event)"
            [invalid]="
              profileForm.deleteEmail().invalid() &&
              profileForm.deleteEmail().touched()
            "
            [disabled]="profileForm.deleteEmail().disabled()"
            (paste)="$event.preventDefault()"
            autocomplete="off"
            placeholder="email@example.com"
          />
        </tui-textfield>
        <tui-error [error]="getFieldError('deleteEmail')" />

        <div class="flex justify-end gap-2">
          <button
            tuiButton
            appearance="secondary"
            (click)="observer.complete()"
          >
            {{ 'cancel' | translate }}
          </button>
          <button
            tuiButton
            appearance="primary"
            [disabled]="profileForm.deleteEmail().value() !== userEmail()"
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
        (skip)="tourService.finish()"
        [disabled]="
          profileForm.name().invalid() ||
          profileForm.name().value() === userEmail()
        "
        [showSkip]="false"
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

  protected readonly model = signal({
    name: '',
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
    required(schemaPath.name, { message: 'profile.name.required' });
    minLength(schemaPath.name, 3, { message: 'profile.name.length' });
    maxLength(schemaPath.name, 50, { message: 'profile.name.length' });

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
  protected readonly countryIds = computed(() =>
    this.countries().map((c) => c.id),
  );
  protected readonly years = Array.from(
    { length: new Date().getFullYear() - 1900 + 1 },
    (_, i) => new Date().getFullYear() - i,
  );
  protected readonly countryNameMap = computed(() => {
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
      .subscribe({
        complete: () => {
          void this.tourService.start();
        },
      });
  }

  async loadProfile(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

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
      name: name === this.userEmail() && profile.first_steps ? '' : name,
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
      messageSound: this.global.messageSoundEnabled(),
      notificationSound: this.global.notificationSoundEnabled(),
      editingMode: this.global.editingMode(),
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

    await this.updateProfile({ private: isPrivate });
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
      : (control.value() as unknown as UserProfileDto[K]);

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

    await this.updateProfile({ [field]: value });
  }

  async saveName(): Promise<void> {
    await this.saveField('name', this.profileForm.name(), {
      transform: (v) => (v || '').trim(),
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
      transform: (v) => (v || '').trim(),
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
    this.global.theme.set(newTheme);
    await this.updateProfile({ theme: newTheme });
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

    // Priority 1: Explicit message from schema
    if (firstError?.message) {
      return this.translate.instant(firstError.message);
    }

    // Priority 2: Extract key (kind or first non-brand key)
    const key =
      firstError?.kind ||
      (typeof firstError === 'object'
        ? Object.keys(firstError).find((k) => k !== '__brand')
        : firstError) ||
      'error';

    // Map Signal Forms error keys to our translation keys
    if (fieldName === 'name') {
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
      await this.updateProfile({ first_steps: true });
    }

    this.updateModel('restartFirstSteps', false);
  }

  onMessageSoundChange(enabled: boolean): void {
    this.updateModel('messageSound', enabled);
    this.global.messageSoundEnabled.set(enabled);
  }

  onNotificationSoundChange(enabled: boolean): void {
    this.updateModel('notificationSound', enabled);
    this.global.notificationSoundEnabled.set(enabled);
  }

  onEditingModeChange(enabled: boolean): void {
    this.updateModel('editingMode', enabled);
    void this.toggleEditingMode(enabled);
  }

  onPrivateProfileChange(enabled: boolean): void {
    this.updateModel('isPrivate', enabled);
    void this.togglePrivateProfile(enabled);
  }

  private async updateProfile(updates: Partial<UserProfileDto>): Promise<void> {
    const result = await this.userProfilesService.updateUserProfile(updates);

    if (!result.success) {
      console.error('Error saving profile:', result.error);
      this.toast.error('profile.saveError');
    } else {
      this.toast.success('profile.saveSuccess');
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
            yes: this.translate.instant('accept'),
            no: this.translate.instant('cancel'),
          } as TuiConfirmData,
        }),
        { defaultValue: false },
      );

      if (!confirmed) {
        // Force the switch to stay false
        this.updateModel('editingMode', false);
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
    this.model.update((m) => ({ ...m, deleteEmail: '' }));
    this.dialogs
      .open(template, {
        size: 'm',
      })
      .subscribe();
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
