import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  PLATFORM_ID,
  signal,
  WritableSignal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import type { AreaDto } from '../models/supabase-tables.dto';
import { AreasService, GlobalData } from '../services';
import { TranslatePipe } from '@ngx-translate/core';
import {
  TuiButton,
  TuiLoader,
  TuiTextfield,
  TuiTitle,
  TuiSurface,
} from '@taiga-ui/core';
import { TuiCardLarge, TuiHeader } from '@taiga-ui/layout';
import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { AreaFormComponent } from './area-form';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-area-list',
  standalone: true,
  imports: [
    RouterLink,
    TranslatePipe,
    TuiLoader,
    TuiTextfield,
    TuiButton,
    TuiTitle,
    TuiSurface,
    TuiCardLarge,
    TuiHeader,
  ],
  template: `
    <section class="w-full max-w-5xl mx-auto p-4">
      <header class="mb-4 flex items-start justify-between gap-2">
        <h1 class="text-2xl font-bold">{{ 'areas.title' | translate }}</h1>

        @if (global.isAdmin()) {
          <button
            tuiButton
            appearance="textfield"
            size="m"
            type="button"
            (click.zoneless)="openCreateDialog()"
          >
            {{ 'areas.new' | translate }}
          </button>
        }
      </header>

      <tui-textfield class="mb-4 block">
        <label tuiLabel for="areas-search">{{
          'areas.search_placeholder' | translate
        }}</label>
        <input
          tuiTextfield
          id="areas-search"
          [placeholder]="'areas.search_placeholder' | translate"
          [value]="query()"
          (input.zoneless)="onQuery($any($event.target).value)"
        />
      </tui-textfield>

      @defer (when !loading()) {
        <div class="grid gap-2">
          @for (a of filtered(); track a.id) {
            <div
              tuiCardLarge
              [tuiSurface]="global.liked() ? 'accent' : 'neutral'"
              class="cursor-pointer"
              [routerLink]="['/area', a.slug]"
            >
              <div class="flex flex-col min-w-0 grow">
                <header tuiHeader>
                  <h2 tuiTitle>{{ a.name }}</h2>
                </header>
                <section>
                  <div class="text-sm opacity-80">
                    {{ a.id }}
                  </div>
                </section>
              </div>
            </div>
          } @empty {
            <div class="opacity-70">{{ 'areas.empty' | translate }}</div>
          }
        </div>
      } @placeholder {
        <div class="flex items-center justify-center py-8">
          <tui-loader size="l" />
        </div>
      } @loading {
        <div class="flex items-center justify-center py-8">
          <tui-loader size="l" />
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'overflow-auto' },
})
export class AreaListComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly areasService = inject(AreasService);
  protected readonly global = inject(GlobalData);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);

  readonly loading = computed(() => this.areasService.loading());
  readonly areas = computed<AreaDto[]>(() => this.areasService.areas());

  readonly query: WritableSignal<string> = signal('');
  readonly filtered = computed<AreaDto[]>(() => {
    const q = this.query().trim().toLowerCase();
    const list = this.areas();
    if (!q) return list;
    return list.filter(
      (a) =>
        a.name.toLowerCase().includes(q) || a.slug.toLowerCase().includes(q),
    );
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      void this.areasService.listAll();
    }
  }

  onQuery(v: string) {
    this.query.set(v);
  }

  openCreateDialog(): void {
    this.dialogs
      .open<boolean>(new PolymorpheusComponent(AreaFormComponent), {
        label: this.translate.instant('areas.newTitle'),
        size: 'm',
      })
      .subscribe({
        next: (created) => {
          if (created && isPlatformBrowser(this.platformId)) {
            void this.areasService.listAll();
          }
        },
      });
  }
}

export default AreaListComponent;
