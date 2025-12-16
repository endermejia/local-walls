import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  inject,
  computed,
  effect,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TuiButton, TuiFlagPipe, TuiTextfield } from '@taiga-ui/core';
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
} from '@taiga-ui/kit';
import { TuiAutoFocus, TuiStringMatcher, TuiDay, TuiYear } from '@taiga-ui/cdk';
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
import { map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

interface Country {
  id: string;
  name: string;
}

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    TranslatePipe,
    TuiButton,
    FormsModule,
    ReactiveFormsModule,
    TuiChevron,
    TuiSelect,
    TuiTextfield,
    TuiAutoFocus,
    TuiDataListWrapper,
    TuiTextarea,
    TuiComboBox,
    TuiFilterByInputPipe,
    TuiFlagPipe,
    TuiInputNumber,
    TuiInputDate,
    TuiInputYear,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="w-full max-w-5xl mx-auto p-4 grid grid-cols-1 gap-4">
      <!-- Nombre -->
      <div>
        <tui-textfield class="w-full" [tuiTextfieldCleaner]="false">
          <label tuiLabel for="nameInput">{{
            'labels.username' | translate
          }}</label>
          <input
            id="nameInput"
            tuiTextfield
            tuiAutoFocus
            class="w-full"
            type="text"
            autocomplete="off"
            [(ngModel)]="displayName"
            (blur)="saveName()"
            (keydown.enter)="saveName()"
          />
        </tui-textfield>
      </div>

      <!-- Bio -->
      <div>
        <tui-textfield class="w-full" [tuiTextfieldCleaner]="false">
          <label tuiLabel for="bioInput">{{ 'labels.bio' | translate }}</label>
          <textarea
            id="bioInput"
            tuiTextarea
            class="w-full"
            rows="4"
            [(ngModel)]="bio"
            (blur)="saveBio()"
          ></textarea>
        </tui-textfield>
      </div>

      <!-- Country & City -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <tui-textfield
            tuiChevron
            class="w-full"
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
                style="margin-right: 8px; vertical-align: middle;"
              />
              {{ item }} -
              {{ idToName(item) }}
            </ng-template>
          </tui-textfield>
        </div>

        <div>
          <tui-textfield tuiChevron class="w-full" [tuiTextfieldCleaner]="true">
            <label tuiLabel for="citySelect">{{
              'labels.city' | translate
            }}</label>
            <input
              id="citySelect"
              tuiSelect
              [(ngModel)]="city"
              (ngModelChange)="saveCity()"
            />
            <tui-data-list-wrapper *tuiTextfieldDropdown new [items]="cities" />
          </tui-textfield>
        </div>
      </div>

      <!-- Birth Date & Starting Climbing Year -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <tui-textfield class="w-full" [tuiTextfieldCleaner]="true">
            <label tuiLabel for="birthDateInput">{{
              'labels.birthDate' | translate
            }}</label>
            <input
              id="birthDateInput"
              tuiInputDate
              [(ngModel)]="birthDate"
              (ngModelChange)="saveBirthDate()"
            />
          </tui-textfield>
        </div>

        <div>
          <tui-textfield class="w-full" [tuiTextfieldCleaner]="true">
            <label tuiLabel for="startingClimbingYearInput">{{
              'labels.startingClimbingYear' | translate
            }}</label>
            <input
              id="startingClimbingYearInput"
              tuiInputYear
              [(ngModel)]="startingClimbingYear"
              (ngModelChange)="saveStartingClimbingYear()"
            />
          </tui-textfield>
        </div>
      </div>

      <!-- Size, Weight & Sex -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <tui-textfield class="w-full" [tuiTextfieldCleaner]="true">
            <label tuiLabel for="sizeInput">{{
              'labels.size' | translate
            }}</label>
            <input
              id="sizeInput"
              tuiInputNumber
              [min]="0"
              [max]="300"
              [(ngModel)]="size"
              (ngModelChange)="saveSize()"
            />
            <span class="tui-textfield__suffix">cm</span>
          </tui-textfield>
        </div>

        <div>
          <tui-textfield class="w-full" [tuiTextfieldCleaner]="true">
            <label tuiLabel for="weightInput">{{
              'labels.weight' | translate
            }}</label>
            <input
              id="weightInput"
              tuiInputNumber
              [min]="0"
              [max]="500"
              [(ngModel)]="weight"
              (ngModelChange)="saveWeight()"
            />
            <span class="tui-textfield__suffix">kg</span>
          </tui-textfield>
        </div>

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

      <!-- Theme & Language -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <tui-textfield
            tuiChevron
            class="w-full"
            [tuiTextfieldCleaner]="false"
            [stringify]="stringifyTheme()"
          >
            <label tuiLabel for="themeSelect">{{
              'labels.theme' | translate
            }}</label>
            <input
              id="themeSelect"
              tuiSelect
              [(ngModel)]="theme"
              (ngModelChange)="saveTheme()"
            />
            <tui-data-list-wrapper *tuiTextfieldDropdown new [items]="themes" />
          </tui-textfield>
        </div>

        <div>
          <tui-textfield
            tuiChevron
            class="w-full"
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
      </div>

      <!-- Logout button -->
      <div class="mt-4">
        <button
          tuiButton
          appearance="secondary"
          type="button"
          (click)="logout()"
        >
          {{ 'auth.logout' | translate }}
        </button>
      </div>
    </section>
  `,
})
export class UserProfileComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);
  private readonly userProfilesService = inject(UserProfilesService);
  private readonly translate = inject(TranslateService);
  protected readonly global = inject(GlobalData);

  readonly profile = computed(() => this.global.userProfile());

  // Campos editables
  displayName = '';
  bio = '';
  language: Language = Languages.ES;
  theme: Theme = Themes.LIGHT;
  country: string | null = null;
  city: string | null = null;
  birthDate: TuiDay | null = null;
  startingClimbingYear: TuiYear | null = null;
  size: number | null = null;
  weight: number | null = null;
  sex: Sex | null = null;

  // Cities - puedes expandir esta lista según necesites
  readonly cities: string[] = [
    'Barcelona',
    'Madrid',
    'Valencia',
    'Sevilla',
    'Zaragoza',
    'Málaga',
    'Murcia',
    'Palma',
    'Las Palmas',
    'Bilbao',
  ];

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

  // Theme selector
  readonly themes: Theme[] = [Themes.LIGHT, Themes.DARK];
  readonly stringifyTheme = computed(() => {
    this.profile();
    this.global.i18nTick();
    return (x: unknown): string => {
      if (typeof x !== 'string') return String(x);
      const key = `options.theme.${x}`;
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

  async loadProfile(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const profile = this.profile();
    if (!profile) return;

    // Inicializar campos editables
    this.displayName = profile.name || '';
    this.bio = profile.bio || '';
    this.language = (profile.language as Language) || Languages.ES;
    this.theme = (profile.theme as Theme) || Themes.LIGHT;
    this.country = profile.country || null;
    this.city = profile.city || null;
    this.sex = (profile.sex as Sex) || null;
    this.size = profile.size || null;
    this.weight = profile.weight || null;

    // Convertir birth_date string a TuiDay
    if (profile.birth_date) {
      const date = new Date(profile.birth_date);
      this.birthDate = new TuiDay(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      );
    }

    // Convertir starting_climbing_year a TuiYear
    if (profile.starting_climbing_year) {
      this.startingClimbingYear = new TuiYear(profile.starting_climbing_year);
    }
  }

  async saveName(): Promise<void> {
    const trimmed = (this.displayName ?? '').trim();
    if (!trimmed) {
      const current = this.profile();
      this.displayName = current?.name ?? '';
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

    if (trimmed === (current?.bio ?? '')) {
      this.bio = current?.bio ?? '';
      return;
    }
    await this.updateProfile({ bio: trimmed });
  }

  async saveTheme(): Promise<void> {
    const current = this.profile();
    if (this.theme === (current?.theme ?? null)) {
      return;
    }
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
    if (this.country === (current?.country ?? null)) {
      return;
    }
    await this.updateProfile({ country: this.country });
  }

  async saveCity(): Promise<void> {
    const current = this.profile();
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
    if (newDate === currentDate) {
      return;
    }
    await this.updateProfile({ birth_date: newDate });
  }

  async saveStartingClimbingYear(): Promise<void> {
    const current = this.profile();
    const newYear = this.startingClimbingYear?.year ?? null;
    if (newYear === (current?.starting_climbing_year ?? null)) {
      return;
    }
    await this.updateProfile({ starting_climbing_year: newYear });
  }

  async saveSize(): Promise<void> {
    const current = this.profile();
    if (this.size === (current?.size ?? null)) {
      return;
    }
    await this.updateProfile({ size: this.size });
  }

  async saveWeight(): Promise<void> {
    const current = this.profile();
    if (this.weight === (current?.weight ?? null)) {
      return;
    }
    await this.updateProfile({ weight: this.weight });
  }

  async saveSex(): Promise<void> {
    const current = this.profile();
    if (this.sex === (current?.sex ?? null)) {
      return;
    }
    await this.updateProfile({ sex: this.sex });
  }

  private async updateProfile(updates: Partial<UserProfileDto>): Promise<void> {
    const result = await this.userProfilesService.updateUserProfile(updates);

    if (!result.success) {
      console.error('Error saving profile:', result.error);
      // Aquí podrías mostrar un toast de error
    }
  }

  async logout(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    await this.supabase.logout();
  }
}
