import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  PLATFORM_ID,
} from '@angular/core';
import { TuiButton } from '@taiga-ui/core';
import { TuiAvatar } from '@taiga-ui/kit';
import { GlobalData } from '../../services';
import { TranslatePipe } from '@ngx-translate/core';
import { isPlatformBrowser } from '@angular/common';

interface Experience {
  company: string;
  role: string;
  employment: string;
  start: string; // e.g., "jun. 2025"
  end?: string; // e.g., "may. 2024"
  duration?: string; // e.g., "3 meses"
  location?: string; // e.g., "En remoto"
  descriptionKey?: string; // i18n key for long description
  skills?: string[]; // list of skills labels
}

interface Certification {
  title: string;
  issuer: string;
  issueDate: string; // e.g., "sept. 2020"
  credentialUrl?: string;
  logo?: string; // image url
  skills?: string[]; // translation keys for skill chips
}

interface Project {
  name: string;
  descriptionKey: string; // i18n key for description
  url: string; // optional external link
  tags?: string[]; // simple tags like tech stack
  example?: string;
}

@Component({
  selector: 'app-home',
  imports: [TuiButton, TuiAvatar, TranslatePipe],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex grow overflow-auto',
  },
})
export class HomeComponent {
  protected readonly github = signal('https://github.com/endermejia');
  protected readonly linkedin = signal(
    'https://www.linkedin.com/in/gabrimejia/',
  );
  protected readonly instagram = signal(
    'https://www.instagram.com/gabri.mejia/',
  );

  protected readonly global = inject(GlobalData);
  private readonly platformId = inject(PLATFORM_ID);

  // Professional experience (Spanish content with i18n descriptions)
  protected readonly experiences = signal<Experience[]>([
    {
      company: 'Inetum',
      role: 'Angular Developer',
      employment: 'Jornada completa',
      start: 'jun. 2025',
      descriptionKey: 'home.experience.inetum',
      skills: [
        'Angular',
        'TypeScript',
        'SSR',
        'Zoneless',
        'Taiga UI',
        'Signals',
        'RxJS',
        'i18n',
      ],
    },
    {
      company: 'CONVOTIS Iberia',
      role: 'Angular Developer',
      employment: 'Jornada completa',
      start: 'jun. 2024',
      end: 'jun. 2025',
      descriptionKey: 'home.experience.convotis',
      skills: ['Angular', 'TypeScript', 'PrimeNG', 'Signals', 'RxJS'],
    },
    {
      company: 'Clavei - CLAVE INFORMATICA S.L.',
      role: 'Angular Developer',
      employment: 'Jornada completa',
      start: 'sept. 2023',
      end: 'may. 2024',
      descriptionKey: 'home.experience.clavei',
      skills: ['SASS', 'HTML5', 'Angular', 'RxJS'],
    },
    {
      company: 'Ricoh España',
      role: 'Senior Frontend Developer',
      employment: 'Jornada completa',
      start: 'jul. 2022',
      end: 'sept. 2023',
      descriptionKey: 'home.experience.ricoh',
      skills: ['SASS', 'HTML5', 'Angular', 'TypeScript'],
    },
    {
      company: 'NTT DATA',
      role: 'Frontend Developer',
      employment: 'Jornada completa',
      start: 'dic. 2019',
      end: 'jul. 2022',
      location: 'Alicante y alrededores',
      descriptionKey: 'home.experience.nttdata',
      skills: ['SASS', 'HTML5', 'Angular', 'RxJS'],
    },
  ]);

  // Expansion state for experience cards (collapsed by default)
  protected readonly expanded = signal<Record<string, boolean>>({});

  protected expKey = (exp: Experience) => `${exp.company}__${exp.start}`;

  protected isExpanded = (exp: Experience): boolean =>
    !!this.expanded()[this.expKey(exp)];

  protected toggleExp(exp: Experience, evt?: Event) {
    if (evt) {
      const e = evt as Event & {
        preventDefault?: () => void;
        stopImmediatePropagation?: () => void;
      };
      e.preventDefault?.();
      e.stopImmediatePropagation?.();
      if (typeof evt.stopPropagation === 'function') {
        evt.stopPropagation();
      }
    }
    const key = this.expKey(exp);
    this.expanded.update((state) => ({ ...state, [key]: !state[key] }));
  }

  protected onExpKeydown(evt: Event, exp: Experience) {
    const e = evt as KeyboardEvent;
    const key = e.key;
    if (key === 'Enter' || key === ' ') {
      e.preventDefault();
      this.toggleExp(exp);
    }
  }

  // Certifications
  protected readonly certifications = signal<Certification[]>([
    {
      title: 'JavaScript Algorithms and Data Structures',
      issuer: 'freeCodeCamp',
      issueDate: 'sept. 2020',
      credentialUrl:
        'https://www.freecodecamp.org/certification/endermejia/javascript-algorithms-and-data-structures',
      logo: 'https://design-style-guide.freecodecamp.org/img/fcc_secondary_small.svg',
      skills: ['skill.javascript'],
    },
    {
      title: 'Responsive Web Design',
      issuer: 'freeCodeCamp',
      issueDate: 'sept. 2020',
      credentialUrl:
        'https://www.freecodecamp.org/certification/endermejia/responsive-web-design',
      logo: 'https://design-style-guide.freecodecamp.org/img/fcc_primary_small.svg',
      skills: ['skill.webdev'],
    },
  ]);

  // Theme-aware FCC logo for light/dark themes
  protected readonly fccLogo = computed(() =>
    this.global.selectedTheme() === 'dark'
      ? 'https://design-style-guide.freecodecamp.org/img/fcc_primary_small.svg'
      : 'https://design-style-guide.freecodecamp.org/img/fcc_secondary_small.svg',
  );

  // Projects
  protected readonly projects = signal<Project[]>([
    {
      name: 'angular19',
      descriptionKey: 'home.projects.angular19.desc',
      url: 'https://github.com/endermejia/angular19',
      example: 'https://angular-app-template.netlify.app',
      tags: ['Angular', 'TypeScript', 'SSR', 'Zoneless'],
    },
    {
      name: 'angular20-portfolio-ssr-zoneless',
      descriptionKey: 'home.projects.angular20.desc',
      url: 'https://github.com/endermejia/angular20-portfolio-ssr-zoneless',
      tags: ['Angular', 'TypeScript', 'SSR', 'Zoneless'],
    },
    {
      name: 'Club Escalada Costa Blanca',
      descriptionKey: 'home.projects.clubescalada.desc',
      url: 'https://github.com/endermejia/clubescaladacostablanca',
      example: 'https://www.clubescaladacostablanca.com/#/blog',
      tags: ['Angular', 'TypeScript', 'SSR', 'Zoneless'],
    },
    {
      name: 'coffee-management',
      descriptionKey: 'home.projects.coffee.desc',
      url: 'https://github.com/endermejia/coffee-management',
      tags: ['React', 'TypeScript', 'Redux', 'Redux Toolkit', 'Tailwind CSS'],
    },
    {
      name: 'astro-photographer',
      descriptionKey: 'home.projects.astro.desc',
      url: 'https://github.com/endermejia/astro-photographer',
      example: 'https://nhoa-noir.netlify.app/#home',
      tags: ['Astro', 'SASS', 'HTML5', 'TypeScript'],
    },
  ]);

  protected openExample(url?: string, evt?: Event) {
    // Prevent the outer anchor (<a [href]="p.url">) from navigating when the example button is clicked
    if (evt) {
      // Cancel default behaviors first (e.g., link activation)
      const e = evt as Event & {
        preventDefault?: () => void;
        stopImmediatePropagation?: () => void;
      };
      e.preventDefault?.();
      // Stop immediate propagation (some UI libs re-dispatch clicks)
      e.stopImmediatePropagation?.();
      // And stop regular propagation as a fallback
      if (typeof evt.stopPropagation === 'function') {
        evt.stopPropagation();
      }
    }
    if (!url) return;
    if (typeof window !== 'undefined' && isPlatformBrowser(this.platformId)) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  constructor() {
    this.global.headerTitle.set('Portfolio');
  }
}
