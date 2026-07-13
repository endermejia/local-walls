import { FormsModule } from '@angular/forms';
import { isPlatformBrowser, Location, NgOptimizedImage } from '@angular/common';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  PLATFORM_ID,
  resource,
  signal,
  untracked,
} from '@angular/core';
import {
  form,
  required,
  minLength,
  maxLength,
  min,
  max,
} from '@angular/forms/signals';

import { injectContext } from '@taiga-ui/polymorpheus';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { PolymorpheusContent } from '@taiga-ui/polymorpheus';
import { TuiDay, TuiStringMatcher } from '@taiga-ui/cdk';
import { TuiHeader } from '@taiga-ui/layout';
import {
  TUI_CONFIRM,
  TUI_COUNTRIES,
  TuiAvatar,
  TuiBadge,
  TuiBadgedContentComponent,
  TuiBadgedContentDirective,
  TuiChevron,
  TuiComboBox,
  TuiDataListWrapper,
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
  TuiFlagPipe,
} from '@taiga-ui/kit';
import {
  TuiButton,
  tuiDateFormatProvider,
  TuiIcon,
  TuiNotification,
  TuiScrollbar,
  TuiTitle,
  TuiDropdown,
  TuiError,
  TuiCalendar,
  TuiCalendarYear,
  TuiInput,
  TuiFilterByInputPipe,
  TuiDialogService,
  type TuiDialogContext,
} from '@taiga-ui/core';

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

import { EightAnuService } from '../../services/eight-anu.service';
import { FollowRequestsService } from '../../services/follow-requests.service';
import { GlobalData } from '../../services/global-data';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { TourService } from '../../services/tour.service';
import { TourStep } from '../../services/tour.service';
import { UserProfilesService } from '../../services/user-profiles.service';

import { FirstStepsDialogComponent } from '../../components/dialogs/first-steps-dialog';
import { FollowRequestsDialogComponent } from '../../components/dialogs/follow-requests-dialog';
import { PurchaseHistoryDialogComponent } from '../../components/dialogs/purchase-history-dialog';
import { TourHintComponent } from '../../components/ui/tour-hint';

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

interface Country {
  id: string;
  name: string;
}

@Component({
  selector: 'app-user-profile-config',
  standalone: true,
  imports: [
    FormsModule,
    NgOptimizedImage,
    TourHintComponent,
    TranslatePipe,
    TuiAvatar,
    TuiBadge,
    TuiBadgedContentComponent,
    TuiBadgedContentDirective,
    TuiButton,
    TuiCalendar,
    TuiCalendarYear,
    TuiChevron,
    TuiComboBox,
    TuiDataListWrapper,
    TuiDropdown,
    TuiError,
    TuiFilterByInputPipe,
    TuiFlagPipe,
    TuiHeader,
    TuiIcon,
    TuiInput,
    TuiInputDate,
    TuiInputNumber,
    TuiInputYear,
    TuiNotification,
    TuiPulse,
    TuiScrollbar,
    TuiSegmented,
    TuiSelect,
    TuiShimmer,
    TuiSkeleton,
    TuiSwitch,
    TuiTextarea,
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

        <!-- Avatar y Nombre -->
        <div class="flex flex-col md:flex-row items-center gap-4">
          <div class="relative inline-block">
            <tui-badged-content
              [class.ring-4]="isFirstSteps()"
              [class.ring-primary]="isFirstSteps()"
              class="rounded-full hover:shadow-lg transition-shadow duration-300"
            >
              @if (userEmail() && (profile()?.avatar || global.userAvatar())) {
                <button
                  tuiButton
                  appearance="action-destructive"
                  size="s"
                  tuiSlot="bottom"
                  class="rounded-full!"
                  type="button"
                  (click)="deleteAvatar()"
                >
                  <tui-icon icon="@tui.trash" />
                </button>
              }
              <span
                tuiAvatar
                (click)="!isUploadingAvatar() && uploadAvatar()"
                (keydown.enter)="!isUploadingAvatar() && uploadAvatar()"
                tabindex="0"
                class="cursor-pointer rounded-full!"
                size="xxl"
                [tuiShimmer]="isUploadingAvatar()"
                [tuiSkeleton]="!userEmail()"
              >
                @if (avatarSrc(); as avatar) {
                  <img [src]="avatar" alt="avatar" />
                } @else {
                  <tui-icon icon="@tui.user" />
                }
              </span>
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
                tuiInput
                type="text"
                autocomplete="off"
                [ngModel]="model().fullName"
                (ngModelChange)="updateModel('fullName', $event)"
                [invalid]="
                  !!profile() &&
                  profileForm.fullName().invalid() &&
                  profileForm.fullName().touched()
                "
                [disabled]="profileForm.fullName().disabled()"
                (blur)="saveName()"
                (keydown.enter)="saveName()"
                [tuiSkeleton]="!userEmail()"
              />
            </tui-textfield>
            <tui-error [error]="fullNameError()" />
            @if (
              tourService.isActive() && tourService.step() === TourStep.WELCOME
            ) {
              <tui-pulse />
            }
            @if (nameEqualsEmail()) {
              <div tuiNotification appearance="warning" class="mt-2">
                <h3 tuiTitle>
                  {{ 'profile.name.equalsEmail' | translate }}
                </h3>
              </div>
            }
          </div>
        </div>
        <!-- Email (readonly) -->
        <div>
          <tui-textfield class="w-full" [tuiTextfieldCleaner]="false">
            <label tuiLabel for="emailInput">{{ 'email' | translate }}</label>
            <input
              tuiInput
              type="text"
              inputmode="email"
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
          <tui-error [error]="bioError()" />
        </div>
        <!-- 8a.nu User -->
        <!-- Temporarily hidden
        <div class="flex items-center gap-4">
          @if (selectedEightAnuUser.value(); as user) {
            <div tuiAvatar size="l">
              @if (user.avatar) {
                <img [src]="user.avatar" alt="avatar" />
              } @else {
                <tui-icon icon="@tui.user" />
              }
            </div>
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
                  <div tuiAvatar size="s" class="mr-2">
                    @if (item.avatar; as avatar) {
                      <img [src]="avatar" alt="avatar" />
                    } @else {
                      <tui-icon icon="@tui.user" />
                    }
                  </div>
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
                *tuiDropdown
                new
                [items]="countryIds() | tuiFilterByInput"
                [itemContent]="countryItem"
              />
              <ng-template #countryItem let-item>
                <img
                  [ngSrc]="item | tuiFlag"
                  [alt]="countryDictionary()[item] || item"
                  width="20"
                  height="15"
                  [style.margin-right.px]="8"
                  [style.vertical-align]="'middle'"
                />
                {{ countryDictionary()[item] || item }}
              </ng-template>
            </tui-textfield>
            <tui-error [error]="countryError()" />
          </div>
          <!-- City -->
          <div>
            <tui-textfield class="w-full" [tuiTextfieldCleaner]="false">
              <label tuiLabel for="cityInput">{{ 'city' | translate }}</label>
              <input
                id="cityInput"
                tuiInput
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
            <tui-error [error]="cityError()" />
          </div>
        </div>
        <!-- Birth Date & Starting Climbing Year -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Birth Date -->
          <div class="grid gap-2">
            <span class="text-sm font-semibold opacity-70 px-1">{{
              'birthDate' | translate
            }}</span>
            <tui-textfield class="w-full" [tuiTextfieldCleaner]="false">
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
              <tui-calendar *tuiDropdown />
            </tui-textfield>
            <tui-error [error]="birthDateError()" />
          </div>
          <!-- Starting Climbing Year -->
          <div class="grid gap-2">
            <span class="text-sm font-semibold opacity-70 px-1">{{
              'startingClimbingYear' | translate
            }}</span>
            <tui-textfield class="w-full" [tuiTextfieldCleaner]="false">
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
                *tuiDropdown
                [value]="model().starting_climbing_year || currentYear"
                (yearClick)="
                  updateModel('starting_climbing_year', $event);
                  saveStartingClimbingYear()
                "
              />
            </tui-textfield>
            <tui-error [error]="startingClimbingYearError()" />
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
            <tui-error [error]="sizeError()" />
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
              <tui-data-list-wrapper *tuiDropdown new [items]="sexes" />
            </tui-textfield>
            <tui-error [error]="sexError()" />
          </div>
        </div>

        <br />

        <!-- PREFERENCES -->
        <div class="flex items-center justify-between gap-4">
          <h2 class="text-lg font-bold m-0">
            {{ 'preferences' | translate }}
          </h2>
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
              <tui-data-list-wrapper *tuiDropdown new [items]="languages()" />
            </tui-textfield>
            <tui-error [error]="languageError()" />

            <!-- Theme -->
            <tui-segmented
              size="l"
              class="w-fit"
              [activeItemIndex]="
                profileForm.theme().value() === Themes.DARK ? 1 : 0
              "
              (activeItemIndexChange)="toggleTheme($event === 1)"
              (mousedown)="lastEvent = $event"
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

        <!-- Modo Edición -->
        <div class="mt-8 pt-8 border-t border-(--tui-border-normal)">
          <div class="flex items-center justify-between gap-4 mb-4">
            <h2 class="text-lg font-bold m-0 flex items-center gap-2">
              <tui-icon icon="@tui.pencil" />
              {{ 'editingMode' | translate }}
            </h2>
            <input
              id="editingSwitch"
              tuiSwitch
              type="checkbox"
              [ngModel]="model().editingMode"
              (ngModelChange)="onEditingModeChange($event)"
              autocomplete="off"
            />
          </div>

          <div tuiNotification appearance="info" class="mt-2">
            <div
              class="text-base font-bold text-(--tui-text-primary) border-b border-(--tui-border-hint) pb-2 mb-3"
            >
              {{ 'profile.editing.infoTitle' | translate }}
            </div>
            <ul class="list-none p-0 m-0 space-y-4 opacity-90">
              <!-- Contribución -->
              <li class="flex items-start gap-3">
                <tui-icon
                  icon="@tui.plus"
                  size="s"
                  class="mt-0.5 text-primary"
                />
                <span>{{ 'profile.editing.infoContribute' | translate }}</span>
              </li>

              <!-- Administrador y sus beneficios anidados -->
              <li class="flex flex-col gap-3">
                <div class="flex items-start gap-3">
                  <tui-icon
                    icon="@tui.user-plus"
                    size="s"
                    class="mt-0.5 text-primary"
                  />
                  <span>{{
                    'profile.editing.infoRequestAdmin' | translate
                  }}</span>
                </div>

                <!-- Sub-puntos de administrador -->
                <ul
                  class="list-none pl-9 m-0 space-y-2 opacity-90 text-[0.95em]"
                >
                  <li class="flex items-start gap-2">
                    <tui-icon
                      icon="@tui.image"
                      size="xs"
                      class="mt-1 text-primary"
                    />
                    <span>{{
                      'profile.editing.infoManageTopos' | translate
                    }}</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <tui-icon
                      icon="@tui.credit-card"
                      size="xs"
                      class="mt-1 text-primary"
                    />
                    <span>{{
                      'profile.editing.infoMonetization' | translate
                    }}</span>
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        </div>

        <br />

        <!-- Account Actions -->
        <h2
          class="text-xl font-bold mt-12 mb-6 border-t border-(--tui-border-normal) pt-8"
        >
          {{ 'accountActions' | translate }}
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Tools & Management -->
          <div
            class="flex flex-col gap-4 p-5 rounded-2xl bg-(--tui-base-02) border border-(--tui-border-normal)"
          >
            <h3
              class="text-base font-semibold flex items-center gap-2 m-0 text-(--tui-text-secondary)"
            >
              <tui-icon icon="@tui.settings" size="s" />
              {{ 'toolsAndManagement' | translate }}
            </h3>

            <div class="flex flex-col gap-3">
              @if (model().isPrivate) {
                <button
                  tuiButton
                  appearance="primary"
                  type="button"
                  size="m"
                  class="w-full justify-start group relative"
                  (click)="openFollowRequestsDialog()"
                >
                  <tui-icon
                    icon="@tui.users"
                    class="mr-2 group-hover:scale-110 transition-transform"
                  />
                  {{ 'followRequests' | translate }}
                  @if (pendingRequestsCount() > 0) {
                    <span tuiBadge class="absolute -top-2 -right-2">{{
                      pendingRequestsCount()
                    }}</span>
                  }
                </button>
              }

              <button
                tuiButton
                appearance="outline"
                type="button"
                size="m"
                class="w-full justify-start group"
                (click)="openPurchaseHistoryDialog()"
              >
                <tui-icon
                  icon="@tui.receipt"
                  class="mr-2 group-hover:scale-110 transition-transform"
                />
                {{ 'purchaseHistory.view' | translate }}
              </button>

              <button
                tuiButton
                appearance="outline"
                type="button"
                size="m"
                class="w-full justify-start group"
                (click)="openImport8aDialog()"
              >
                <tui-icon
                  icon="@tui.download"
                  class="mr-2 group-hover:scale-110 transition-transform"
                />
                {{ 'import8a.button' | translate }}
              </button>
            </div>
          </div>

          <!-- Session & Security -->
          <div
            class="flex flex-col gap-4 p-5 rounded-2xl bg-(--tui-base-02) border border-(--tui-border-normal)"
          >
            <h3
              class="text-base font-semibold flex items-center gap-2 m-0 text-(--tui-text-secondary)"
            >
              <tui-icon icon="@tui.shield" size="s" />
              {{ 'securityAndSession' | translate }}
            </h3>

            <div class="flex flex-col gap-3">
              <button
                tuiButton
                appearance="secondary"
                type="button"
                size="m"
                class="w-full justify-start group"
                (click)="logout()"
              >
                <tui-icon
                  icon="@tui.log-out"
                  class="mr-2 group-hover:scale-110 transition-transform"
                />
                {{ 'auth.logout' | translate }}
              </button>

              <button
                tuiButton
                appearance="flat-destructive"
                type="button"
                size="m"
                class="w-full justify-start group"
                (click)="deleteAccount(deleteDialog)"
              >
                <tui-icon
                  icon="@tui.trash"
                  class="mr-2 group-hover:scale-110 transition-transform"
                />
                {{ 'profile.deleteAccount.button' | translate }}
              </button>
            </div>
          </div>
        </div>
      </section>
    </tui-scrollbar>

    <ng-template #deleteDialog let-observer>
      <div class="flex flex-col gap-4">
        <h3 tuiTitle>{{ 'profile.deleteAccount.title' | translate }}</h3>
        <p class="text-(--tui-text-negative) font-bold">
          {{ 'profile.deleteAccount.warning' | translate }}
        </p>
        <p>
          {{ 'profile.deleteAccount.instruction_prefix' | translate }}
          <strong>{{ userEmail() }}</strong>
          {{ 'profile.deleteAccount.instruction_suffix' | translate }}
        </p>

        <tui-textfield>
          <input
            tuiInput
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
        <tui-error [error]="deleteEmailError()" />

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
          profileForm.fullName().invalid() ||
          profileForm.fullName().value() === userEmail()
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
  protected readonly followRequestsService = inject(FollowRequestsService);
  readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly dialogs = inject(TuiDialogService);

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
  protected isUploadingAvatar = signal(false);
  protected avatarSrc = computed<string | null>(() => {
    return this.global.userAvatar() || null;
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
    this.global.i18nTick();
    const allLangs = Object.values(Languages) as Language[];
    return allLangs.sort((a, b) => {
      const labelA = this.translate.instant(`options.language.${a}`);
      const labelB = this.translate.instant(`options.language.${b}`);
      return labelA.localeCompare(labelB);
    });
  });
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
  stringifyCountryId = (id: string | null): string =>
    id ? (this.countryDictionary()[id] ?? id) : '';
  readonly matcher: TuiStringMatcher<string> = (id, search) =>
    (this.countryDictionary()[id] ?? id).toLowerCase() === search.toLowerCase();

  stringifyEightAnuUser = (user: EightAnuUser | null): string =>
    user?.userName || '';

  // ----- Data -----

  protected readonly pendingRequestsCountResource = resource({
    params: () => this.followRequestsService.requestsChange(),
    loader: async () => {
      if (!isPlatformBrowser(this.platformId)) return 0;
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

      // Track the current active language (from service)
      const currentLang = this.global.currentLang();

      // Only show the toast when it matches our target language
      if (currentLang === pending.lang) {
        untracked(() => {
          this.toast.success(pending.key);
          this.pendingSuccessToast.set(null);
        });
      }
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
      messageSound: profile.message_sound ?? this.global.messageSoundEnabled(),
      notificationSound:
        profile.notification_sound ?? this.global.notificationSoundEnabled(),
      editingMode: profile.editing_mode ?? this.global.editingMode(),
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
    this.global.setTheme(newTheme, this.lastEvent);
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
        { defaultValue: null },
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

  async deleteAvatar(): Promise<void> {
    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('profile.avatar.delete.title'),
        size: 's',
        data: {
          content: this.translate.instant('profile.avatar.delete.confirm'),
          yes: this.translate.instant('delete'),
          no: this.translate.instant('cancel'),
          appearance: 'negative',
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
    this.global.messageSoundEnabled.set(enabled);
  }

  async onNotificationSoundChange(enabled: boolean): Promise<void> {
    this.updateModel('notificationSound', enabled);
    await this.updateProfile(
      { notification_sound: enabled },
      'profile.updated.notification_sound',
    );
    this.global.notificationSoundEnabled.set(enabled);
  }

  async onEditingModeChange(enabled: boolean): Promise<void> {
    // If enabling, we need to show the confirmation first
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
      // Disabling is always allowed without confirmation
      this.updateModel('editingMode', false);
      this.global.editingMode.set(false);
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
        lang: updates.language || this.global.selectedLanguage(),
      });
    }
  }

  async toggleEditingMode(enabled: boolean): Promise<boolean> {
    if (this.global.editingMode() === enabled) {
      return true;
    }

    if (enabled && !this.global.isAdmin()) {
      const hasPermissions = this.global.isAreaAdmin();
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
        // Force the switch to stay false
        this.updateModel('editingMode', false);
        this.global.editingMode.set(false);
        return false;
      }
    }

    this.global.editingMode.set(enabled);
    return true;
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

  protected openFollowRequestsDialog(): void {
    void firstValueFrom(
      this.dialogs.open(
        new PolymorpheusComponent(FollowRequestsDialogComponent),
        {
          label: this.translate.instant('followRequests'),
          size: 'm',
        },
      ),
    );
  }

  openPurchaseHistoryDialog(): void {
    this.dialogs
      .open(new PolymorpheusComponent(PurchaseHistoryDialogComponent), {
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
