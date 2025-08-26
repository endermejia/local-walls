import {
  computed,
  inject,
  Injectable,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { Router } from '@angular/router';
import { TuiFlagPipe } from '@taiga-ui/core';
import { TranslateService } from '@ngx-translate/core';
import { LocalStorage } from './local-storage';
import { TUI_ENGLISH_LANGUAGE, TUI_SPANISH_LANGUAGE } from '@taiga-ui/i18n';

interface User {
  name: string;
  picture: string;
}

export interface SearchItem {
  href: string;
  title: string;
  subtitle?: string;
  icon?: string;
}
export type SearchData = Record<string, readonly SearchItem[]>;

export interface OptionsItem {
  name: string;
  icon: string;
  fn?: (item: OptionsItem) => void;
}
export type OptionsData = Record<string, readonly OptionsItem[]>;

@Injectable({
  providedIn: 'root',
})
export class GlobalData {
  private translate = inject(TranslateService);
  private router = inject(Router);
  private localStorage = inject(LocalStorage);
  protected readonly flagPipe = new TuiFlagPipe();

  headerTitle: WritableSignal<string> = signal('Portfolio');
  user: WritableSignal<User> = signal({
    name: 'Gabriel Mejía',
    picture: 'https://avatars.githubusercontent.com/u/55515925?v=4',
  });

  selectedLanguage: WritableSignal<'es' | 'en'> = signal('en');
  selectedTheme: WritableSignal<'light' | 'dark'> = signal('dark');

  // Computed signal for Taiga UI language based on selectedLanguage
  tuiLanguage: Signal<
    typeof TUI_SPANISH_LANGUAGE | typeof TUI_ENGLISH_LANGUAGE
  > = computed(() =>
    this.selectedLanguage() === 'es'
      ? TUI_SPANISH_LANGUAGE
      : TUI_ENGLISH_LANGUAGE,
  );

  drawer: WritableSignal<OptionsData> = signal({
    Navigation: [
      {
        name: 'Home',
        icon: '@tui.home',
        fn: () => {
          if (typeof window !== 'undefined') {
            document
              ?.querySelector('#profile')
              ?.scrollIntoView({ behavior: 'smooth' });
          }
        },
      },
      {
        name: 'Experience',
        icon: '@tui.briefcase',
        fn: () => {
          if (typeof window !== 'undefined') {
            document
              ?.querySelector('#experience')
              ?.scrollIntoView({ behavior: 'smooth' });
          }
        },
      },
      {
        name: 'Certifications',
        icon: '@tui.file',
        fn: () => {
          if (typeof window !== 'undefined') {
            document
              ?.querySelector('#certifications')
              ?.scrollIntoView({ behavior: 'smooth' });
          }
        },
      },
      {
        name: 'Projects',
        icon: '@tui.layers',
        fn: () => {
          if (typeof window !== 'undefined') {
            document
              ?.querySelector('#projects')
              ?.scrollIntoView({ behavior: 'smooth' });
          }
        },
      },
      {
        name: 'Contact',
        icon: '@tui.send',
        fn: () => {
          if (typeof window !== 'undefined') {
            document
              ?.querySelector('#contact')
              ?.scrollIntoView({ behavior: 'smooth' });
          }
        },
      },
    ],
  });

  settings: Signal<OptionsData> = computed(() => ({
    preferences: [
      {
        name: 'settings.language',
        icon: this.flagPipe.transform(
          this.selectedLanguage() === 'es' ? 'es' : 'gb',
        ),
        fn: () => this.switchLanguage(),
      },
      {
        name: 'settings.theme',
        icon: `@tui.${this.selectedTheme() === 'dark' ? 'sun' : 'moon'}`,
        fn: () => this.switchTheme(),
      },
    ],
  }));

  searchPopular: WritableSignal<string[]> = signal(['GitHub', 'LinkedIn']);
  searchData: WritableSignal<SearchData> = signal({
    Social: [
      {
        title: 'GitHub',
        href: 'https://github.com/endermejia',
        icon: '@tui.github',
      },
      {
        title: 'LinkedIn',
        href: 'https://www.linkedin.com/in/gabrimejia/',
        icon: '@tui.linkedin',
      },
    ],
    Portfolio: [
      {
        title: 'Experience',
        href: '#experience',
        icon: '@tui.briefcase',
      },
      {
        title: 'Certifications',
        href: '#certifications',
        icon: '@tui.file',
      },
      {
        title: 'Projects',
        href: '#projects',
        icon: '@tui.layers',
      },
      {
        title: 'Contact',
        href: '#contact',
        icon: '@tui.send',
      },
    ],
  });

  private switchLanguage(): void {
    this.selectedLanguage.set(this.selectedLanguage() === 'es' ? 'en' : 'es');
    this.translate.use(this.selectedLanguage());
    this.localStorage.setItem('language', this.selectedLanguage());
  }

  private switchTheme(): void {
    this.selectedTheme.set(this.selectedTheme() === 'dark' ? 'light' : 'dark');
    this.localStorage.setItem('theme', this.selectedTheme());
  }
}
