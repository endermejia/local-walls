import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  InputSignal,
  WritableSignal,
  signal,
  effect,
} from '@angular/core';
import { isPlatformBrowser, LowerCasePipe } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TuiCardLarge } from '@taiga-ui/layout';
import { TuiSurface, TuiLoader, TuiTitle } from '@taiga-ui/core';
import { AreasService, GlobalData } from '../services';
import { SectionHeaderComponent } from '../components/section-header';
import { TuiBadge } from '@taiga-ui/kit';
import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { AreaFormComponent } from './area-form';
import { Router } from '@angular/router';
import { ConfirmDialogComponent } from '../components/confirm-dialog';
import { AreaDetail } from '../models';
import { ChartRoutesByGradeComponent } from '../components';
import { TuiHeader } from '@taiga-ui/layout';

@Component({
  selector: 'app-area',
  standalone: true,
  imports: [
    TuiCardLarge,
    TranslatePipe,
    TuiSurface,
    TuiLoader,
    SectionHeaderComponent,
    TuiBadge,
    ChartRoutesByGradeComponent,
    TuiHeader,
    LowerCasePipe,
    TuiTitle,
  ],
  template: `
    <section class="w-full max-w-5xl mx-auto p-4">
      @if (!area()) {
        <div class="flex items-center justify-center py-16">
          <tui-loader size="xl" />
        </div>
      } @else {
        <div class="mb-4 flex items-center justify-between gap-2">
          <app-section-header
            class="w-full"
            [title]="area()?.name || ''"
            [liked]="area()?.liked || false"
            (back)="goBack()"
            (toggleLike)="onToggleLike()"
          />
          @if (global.isAdmin()) {
            <tui-badge
              class="cursor-pointer"
              appearance="neutral"
              iconStart="@tui.square-pen"
              size="xl"
              (click.zoneless)="openEditDialog()"
              [attr.aria-label]="'common.edit' | translate"
              [attr.title]="'common.edit' | translate"
            />
            <tui-badge
              class="cursor-pointer"
              appearance="negative"
              iconStart="@tui.trash"
              size="xl"
              (click.zoneless)="deleteArea()"
              [attr.aria-label]="'common.delete' | translate"
              [attr.title]="'common.delete' | translate"
            />
          }
        </div>

        <!-- Sectors list -->
        @if (area()?.crags?.length) {
          <div class="mt-2">
            <h2 class="text-lg font-semibold mb-2">
              {{ 'labels.sectors' | translate }}
            </h2>
            <div class="grid gap-2">
              @for (c of area()!.crags; track c.slug) {
                <div tuiCardLarge [tuiSurface]="'neutral'" class="p-4">
                  <div class="flex flex-col min-w-0 grow">
                    <header tuiHeader>
                      <h2 tuiTitle>{{ c.name }}</h2>
                    </header>
                    <section>
                      <div class="text-sm opacity-80">
                        {{ c.routes_count }}
                        {{ 'labels.routes' | translate | lowercase }}
                      </div>
                    </section>
                    <div (click.zoneless)="$event.stopPropagation()">
                      <app-chart-routes-by-grade
                        class="mt-2"
                        [grades]="c.grades"
                      />
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        } @else {
          <div tuiCardLarge [tuiSurface]="'neutral'" class="p-4">
            <p class="mt-2 opacity-70">
              {{ 'areas.detail_placeholder' | translate }}
            </p>
          </div>
        }
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'overflow-auto' },
})
export class AreaComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly areas = inject(AreasService);
  protected readonly global = inject(GlobalData);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);

  areaSlug: InputSignal<string> = input.required<string>();
  readonly area: WritableSignal<AreaDetail | null> = signal<AreaDetail | null>(
    null,
  );

  constructor() {
    effect(() => {
      // Track slug changes to reload data when navigating within the same component
      const slug = this.areaSlug();
      void this.load(slug);
    });
  }

  private async load(slug: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    const data = await this.areas.getAreaDetailBySlug(slug);
    this.area.set(data);

    // Reset liked state; do not trigger extra RPCs here
    this.global.liked.set(false);

    this.global.resetDataByPage('area');
    if (data) {
      this.global.area.set(data);
    } else {
      this.global.area.set(null);
    }
  }

  async onToggleLike(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    const current = this.area();
    if (!current) return;
    try {
      const res = await this.areas.toggleAreaLike(current.id).then((a) => {
        this.area.set({
          ...current,
          liked: !current.liked,
        });
        return a;
      });
      if (res) {
        // Update liked signal so the UI reflects the new state immediately
        this.global.liked.set(res.action === 'inserted');
      }
    } catch {
      /* empty */
    }
  }

  deleteArea(): void {
    const current = this.area();
    if (!current) return;
    if (!isPlatformBrowser(this.platformId)) return;

    // Resolve translations asynchronously to ensure interpolation works
    this.translate
      .get(['areas.deleteTitle', 'areas.deleteConfirm'], { name: current.name })
      .subscribe((t) => {
        const title = t['areas.deleteTitle'];
        const message = t['areas.deleteConfirm'];

        this.dialogs
          .open<boolean>(new PolymorpheusComponent(ConfirmDialogComponent), {
            label: title,
            size: 's',
            data: {
              title,
              message,
              confirmLabel: 'common.delete',
              cancelLabel: 'common.cancel',
            },
          })
          .subscribe({
            next: async (confirmed) => {
              if (!confirmed) return;
              try {
                await this.areas.delete(current.id);
                await this.router.navigateByUrl('/areas');
              } catch {
                /* empty */
              }
            },
          });
      });
  }

  goBack(): void {
    if (!isPlatformBrowser(this.platformId)) {
      void this.router.navigateByUrl('/areas');
      return;
    }

    const target = this.resolveBackUrl();
    void this.router.navigateByUrl(target);
  }

  openEditDialog(): void {
    const current = this.area();
    if (!current) return;
    this.dialogs
      .open<string | null>(new PolymorpheusComponent(AreaFormComponent), {
        label: this.translate.instant('areas.editTitle'),
        size: 'm',
        data: { areaSlug: current.slug },
      })
      .subscribe({
        next: async (result) => {
          if (typeof result === 'string' && result.length) {
            if (isPlatformBrowser(this.platformId)) {
              if (result !== current.slug) {
                await this.router.navigateByUrl(`/area/${result}`);
                return;
              }
            }
          }
          await this.load(current.slug);
        },
      });
  }

  private resolveBackUrl(): '/home' | '/areas' {
    let nav = this.router.lastSuccessfulNavigation?.previousNavigation ?? null;
    let steps = 0;
    while (nav && steps < 10) {
      const url = (nav.finalUrl ?? nav.initialUrl)?.toString() ?? '';
      if (url.startsWith('/home')) return '/home';
      if (url.startsWith('/areas')) return '/areas';
      nav = nav.previousNavigation ?? null;
      steps++;
    }
    return '/areas';
  }
}
