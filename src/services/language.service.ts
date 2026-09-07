import {
  computed,
  effect,
  inject,
  Injectable,
  signal,
  Signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import {
  TUI_ENGLISH_LANGUAGE,
  TUI_FRENCH_LANGUAGE,
  TUI_GERMAN_LANGUAGE,
  TUI_ITALIAN_LANGUAGE,
  TUI_SPANISH_LANGUAGE,
  TuiLanguage,
} from '@taiga-ui/i18n';

import { TranslateService } from '@ngx-translate/core';
import { map, merge, startWith, firstValueFrom } from 'rxjs';

import { Language, Languages } from '../models';

import { AuthStateService } from './auth-state.service';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly authState = inject(AuthStateService);

  readonly selectedLanguage: Signal<Language> = computed(
    () => this.authState.userProfile()?.language || Languages.ES,
  );

  readonly currentLang = toSignal(
    this.translate.onLangChange.pipe(map((e) => e.lang as Language)),
    { initialValue: this.translate.currentLang as Language },
  );

  readonly i18nTick = signal(0);

  readonly tuiLanguage: Signal<TuiLanguage> = computed(() => {
    const lang = this.selectedLanguage();
    switch (lang) {
      case Languages.ES:
        return TUI_SPANISH_LANGUAGE;
      case Languages.DE:
        return TUI_GERMAN_LANGUAGE;
      case Languages.FR:
        return TUI_FRENCH_LANGUAGE;
      case Languages.IT:
        return TUI_ITALIAN_LANGUAGE;
      default:
        return TUI_ENGLISH_LANGUAGE;
    }
  });

  private readonly langUpdateTrigger = toSignal(
    merge(
      this.translate.onLangChange,
      this.translate.onTranslationChange,
      this.translate.onDefaultLangChange,
    ).pipe(
      map(() => Date.now()),
      startWith(0),
    ),
  );

  constructor() {
    this.translate.addLangs(Object.values(Languages));

    effect(() => {
      if (this.langUpdateTrigger()) {
        untracked(() => {
          this.i18nTick.update((v) => v + 1);
        });
      }
    });

    effect(() => {
      const selectedLanguage = this.selectedLanguage();
      if (selectedLanguage) {
        void firstValueFrom(this.translate.use(selectedLanguage), {
          defaultValue: undefined,
        });
      }
    });
  }
}
