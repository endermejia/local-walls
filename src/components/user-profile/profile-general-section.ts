import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TuiDay, TuiStringMatcher } from '@taiga-ui/cdk';
import {
  TuiButton,
  TuiCalendar,
  TuiCalendarYear,
  TuiDropdown,
  TuiError,
  TuiFilterByInputPipe,
  TuiIcon,
  TuiInput,
  TuiNotification,
  TuiTitle,
} from '@taiga-ui/core';
import {
  TuiAvatar,
  TuiBadgedContentComponent,
  TuiBadgedContentDirective,
  TuiChevron,
  TuiComboBox,
  TuiDataListWrapper,
  TuiFlagPipe,
  TuiInputDate,
  TuiInputNumber,
  TuiInputYear,
  TuiPulse,
  TuiSelect,
  TuiShimmer,
  TuiSkeleton,
  TuiTextarea,
} from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { TourService, TourStep } from '../../services/tour.service';

import { ProfileConfigModel, Sex, Sexes } from '../../models';

import { TourHintComponent } from '../ui/tour-hint';

@Component({
  selector: 'app-profile-general-section',
  host: { class: 'contents' },
  imports: [
    FormsModule,
    NgOptimizedImage,
    TourHintComponent,
    TranslatePipe,
    TuiAvatar,
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
    TuiIcon,
    TuiInput,
    TuiInputDate,
    TuiInputNumber,
    TuiInputYear,
    TuiNotification,
    TuiPulse,
    TuiSelect,
    TuiShimmer,
    TuiSkeleton,
    TuiTextarea,
    TuiTitle,
  ],
  template: `
    <!-- Avatar y Nombre -->
    <div class="flex flex-col md:flex-row items-center gap-4">
      <div class="relative inline-block">
        <tui-badged-content
          [class.ring-4]="isFirstSteps()"
          [class.ring-primary]="isFirstSteps()"
          class="rounded-full hover:shadow-lg transition-shadow duration-300"
        >
          @if (userEmail() && (avatarSrc() || hasAvatar())) {
            <button
              tuiButton
              appearance="action-destructive"
              size="s"
              tuiSlot="bottom"
              class="rounded-full!"
              type="button"
              (click)="deleteAvatar.emit()"
            >
              <tui-icon icon="@tui.trash" />
            </button>
          }
          <span
            tuiAvatar
            (click)="!isUploadingAvatar() && uploadAvatar.emit()"
            (keydown.enter)="!isUploadingAvatar() && uploadAvatar.emit()"
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
            tourService.isActive() && tourService.step() === TourStep.WELCOME
          "
          [class.ring-primary]="
            tourService.isActive() && tourService.step() === TourStep.WELCOME
          "
        >
          <label tuiLabel for="nameInput">{{ 'userName' | translate }}</label>
          <input
            id="nameInput"
            tuiInput
            type="text"
            autocomplete="off"
            [ngModel]="model().fullName"
            (ngModelChange)="onModelChange('fullName', $event)"
            [invalid]="
              profileForm()['fullName']().invalid() &&
              profileForm()['fullName']().touched()
            "
            [disabled]="profileForm()['fullName']().disabled()"
            (blur)="saveField.emit('fullName')"
            (keydown.enter)="saveField.emit('fullName')"
            [tuiSkeleton]="!userEmail()"
          />
        </tui-textfield>
        <tui-error [error]="fullNameError()" />
        @if (
          tourService.isActive() && tourService.step() === TourStep.WELCOME
        ) {
          <span class="absolute top-4 right-4 pointer-events-none z-10 size-0">
            <tui-pulse />
          </span>
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
          (ngModelChange)="onModelChange('bio', $event)"
          [invalid]="
            profileForm()['bio']().invalid() && profileForm()['bio']().touched()
          "
          [disabled]="profileForm()['bio']().disabled()"
          (blur)="saveField.emit('bio')"
          [tuiSkeleton]="!userEmail()"
        ></textarea>
      </tui-textfield>
      <tui-error [error]="bioError()" />
    </div>

    <!-- Country & City -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Country -->
      <div>
        <tui-textfield
          tuiChevron
          [tuiTextfieldCleaner]="false"
          [stringify]="stringifyCountryId()"
        >
          <label tuiLabel for="countrySelect">{{
            'country' | translate
          }}</label>
          <input
            id="countrySelect"
            tuiComboBox
            autocomplete="off"
            [ngModel]="model().country"
            (ngModelChange)="onModelChange('country', $event)"
            [invalid]="
              profileForm()['country']().invalid() &&
              profileForm()['country']().touched()
            "
            [disabled]="profileForm()['country']().disabled()"
            [matcher]="matcher()"
            [strict]="true"
            (change)="saveField.emit('country')"
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
            (ngModelChange)="onModelChange('city', $event)"
            [invalid]="
              profileForm()['city']().invalid() &&
              profileForm()['city']().touched()
            "
            [disabled]="profileForm()['city']().disabled()"
            (blur)="saveField.emit('city')"
            (keydown.enter)="saveField.emit('city')"
            [tuiSkeleton]="!userEmail()"
          />
        </tui-textfield>
        <tui-error [error]="cityError()" />
      </div>
    </div>

    <!-- Birth Date & Starting Climbing Year -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Birth Date -->
      <div>
        <tui-textfield class="w-full" [tuiTextfieldCleaner]="false">
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
            (ngModelChange)="onModelChange('birth_date', $event)"
            (blur)="saveField.emit('birth_date')"
            (keydown.enter)="saveField.emit('birth_date')"
            [invalid]="
              profileForm()['birth_date']().invalid() &&
              profileForm()['birth_date']().touched()
            "
            [disabled]="profileForm()['birth_date']().disabled()"
            [tuiSkeleton]="!userEmail()"
            autocomplete="off"
          />
          <tui-calendar *tuiDropdown />
        </tui-textfield>
        <tui-error [error]="birthDateError()" />
      </div>

      <!-- Starting Climbing Year -->
      <div>
        <tui-textfield class="w-full" [tuiTextfieldCleaner]="false">
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
            (ngModelChange)="onModelChange('starting_climbing_year', $event)"
            (blur)="saveField.emit('starting_climbing_year')"
            (keydown.enter)="saveField.emit('starting_climbing_year')"
            [invalid]="
              profileForm()['starting_climbing_year']().invalid() &&
              profileForm()['starting_climbing_year']().touched()
            "
            [disabled]="profileForm()['starting_climbing_year']().disabled()"
            [tuiSkeleton]="!userEmail()"
            autocomplete="off"
          />
          <tui-calendar-year
            *tuiDropdown
            [value]="model().starting_climbing_year || currentYear"
            (yearClick)="
              onModelChange('starting_climbing_year', $event);
              saveField.emit('starting_climbing_year')
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
            (ngModelChange)="onModelChange('size', $event)"
            [invalid]="
              profileForm()['size']().invalid() &&
              profileForm()['size']().touched()
            "
            [disabled]="profileForm()['size']().disabled()"
            (blur)="saveField.emit('size')"
            (keydown.enter)="saveField.emit('size')"
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
            (ngModelChange)="onModelChange('sex', $event)"
            [invalid]="
              profileForm()['sex']().invalid() &&
              profileForm()['sex']().touched()
            "
            [disabled]="profileForm()['sex']().disabled()"
            (change)="saveField.emit('sex')"
            [tuiSkeleton]="!userEmail()"
            autocomplete="off"
          />
          <tui-data-list-wrapper *tuiDropdown new [items]="sexes" />
        </tui-textfield>
        <tui-error [error]="sexError()" />
      </div>
    </div>

    <ng-template #tourHint>
      <app-tour-hint
        [description]="'tour.config.description' | translate"
        (next)="tourService.next()"
        (skip)="tourService.finish()"
        [disabled]="
          profileForm()['fullName']().invalid() ||
          profileForm()['fullName']().value?.() === userEmail()
        "
        [showSkip]="false"
      />
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileGeneralSectionComponent {
  protected readonly tourService = inject(TourService);
  protected readonly TourStep = TourStep;

  readonly model = input.required<ProfileConfigModel>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly profileForm = input.required<any>();
  readonly userEmail = input<string>('');
  readonly avatarSrc = input<string | null>(null);
  readonly hasAvatar = input<boolean>(false);
  readonly isUploadingAvatar = input<boolean>(false);
  readonly isFirstSteps = input<boolean>(false);
  readonly nameEqualsEmail = input<boolean>(false);

  readonly countryIds = input<readonly string[]>([]);
  readonly countryDictionary = input<Record<string, string>>({});
  readonly stringifyCountryId = input<(id: unknown) => string>((x: unknown) =>
    String(x),
  );
  readonly matcher = input<TuiStringMatcher<string>>((_item: string) => true);
  readonly stringifySex = input<(sex: unknown) => string>((x: unknown) =>
    String(x),
  );

  readonly fullNameError = input<string | null>(null);
  readonly bioError = input<string | null>(null);
  readonly countryError = input<string | null>(null);
  readonly cityError = input<string | null>(null);
  readonly birthDateError = input<string | null>(null);
  readonly startingClimbingYearError = input<string | null>(null);
  readonly sizeError = input<string | null>(null);
  readonly sexError = input<string | null>(null);

  readonly updateModel = output<{ field: string; value: unknown }>();
  readonly saveField = output<string>();
  readonly uploadAvatar = output<void>();
  readonly deleteAvatar = output<void>();

  readonly sexes: readonly Sex[] = [Sexes.MALE, Sexes.FEMALE, Sexes.OTHER];
  readonly today: TuiDay = TuiDay.currentLocal();
  readonly minBirthDate: TuiDay = new TuiDay(1900, 0, 1);
  readonly currentYear: number = new Date().getFullYear();
  readonly minYear: number = 1900;

  protected onModelChange(field: string, value: unknown): void {
    this.updateModel.emit({ field, value });
  }
}
