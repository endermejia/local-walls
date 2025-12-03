import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  InputSignal,
  effect,
} from '@angular/core';
import { isPlatformBrowser, LowerCasePipe } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TuiCardLarge } from '@taiga-ui/layout';
import { TuiSurface, TuiLoader, TuiTitle, TuiButton } from '@taiga-ui/core';
import { AreasService, GlobalData } from '../services';
import { SectionHeaderComponent } from '../components/section-header';
import { TuiAvatar, TuiBadge } from '@taiga-ui/kit';
import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { AreaFormComponent } from './area-form';
import { Router, RouterLink } from '@angular/router';
import { ConfirmDialogComponent } from '../components/confirm-dialog';
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
    RouterLink,
    TuiButton,
    TuiAvatar,
  ],
  template: `
    <section class="w-full max-w-5xl mx-auto p-4">
      @let area = global.area();
      @if (area) {
        <div class="mb-4 flex items-center justify-between gap-2">
          <app-section-header
            class="w-full"
            [title]="area.name"
            [liked]="area.liked"
            (back)="goBack()"
            (toggleLike)="onToggleLike()"
          />
          @if (global.isAdmin()) {
            <tui-badge
              class="cursor-pointer"
              appearance="neutral"
              iconStart="@tui.square-pen"
              size="xl"
              (click.zoneless)="openEditArea()"
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

        <div class="mb-2 flex justify-end">
          <app-chart-routes-by-grade [grades]="area.grades" />
        </div>

        <!-- Sectors list -->
        @let areasLenght = area.crags.length;

        <!-- Sectors list header -->
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-2xl font-semibold mb-2">
            <tui-avatar
              tuiThumbnail
              size="l"
              [src]="global.iconSrc()('crag')"
              class="self-center"
              [attr.aria-label]="'labels.crag' | translate"
            />
            {{ areasLenght }}
            {{
              'labels.' + (areasLenght === 1 ? 'crag' : 'crags')
                | translate
                | lowercase
            }}
          </h2>
          @if (global.isAdmin()) {
            <button
              tuiButton
              appearance="textfield"
              size="m"
              type="button"
              class="my-4"
              (click.zoneless)="openCreateCrag()"
            >
              {{ 'crags.new' | translate }}
            </button>
          }
        </div>

        <div class="grid gap-2 grid-cols-1 md:grid-cols-2">
          @for (crag of area.crags; track crag.slug) {
            <div
              tuiCardLarge
              [tuiSurface]="crag.liked ? 'outline-destructive' : 'outline'"
              class="cursor-pointer"
              [routerLink]="['/crag', crag.slug]"
            >
              <div class="flex flex-col min-w-0 grow">
                <header tuiHeader>
                  <h2 tuiTitle>{{ crag.name }}</h2>
                </header>
                <section class="flex items-center justify-between gap-2">
                  <div class="text-xl">
                    {{ crag.topos_count }}
                    {{ 'labels.topos' | translate | lowercase }}
                  </div>
                  <app-chart-routes-by-grade
                    (click.zoneless)="$event.stopPropagation()"
                    [grades]="crag.grades"
                  />
                </section>
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="flex items-center justify-center py-16">
          <tui-loader size="xxl" />
        </div>
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

  constructor() {
    effect(() => {
      const slug = this.areaSlug();
      void this.load(slug);
    });
  }

  private async load(slug: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    const area = await this.areas.getAreaDetailBySlug(slug);
    this.global.resetDataByPage('area');
    if (area) {
      this.global.area.set(area);
    } else {
      this.global.area.set(null);
    }
  }

  onToggleLike(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const area = this.global.area();
    if (!area) return;
    this.global.area.set({
      ...area,
      liked: !area.liked,
    });
    this.areas.toggleAreaLike(area.id).catch(() =>
      this.global.area.set({
        ...area,
        liked: area.liked,
      }),
    );
  }

  deleteArea(): void {
    const area = this.global.area();
    if (!area) return;
    if (!isPlatformBrowser(this.platformId)) return;

    // Resolve translations asynchronously to ensure interpolation works
    this.translate
      .get(['areas.deleteTitle', 'areas.deleteConfirm'], { name: area.name })
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
                await this.areas.delete(area.id);
                await this.router.navigateByUrl('/areas');
              } catch {
                /* empty */
              }
            },
          });
      });
  }

  openEditArea(): void {
    const area = this.global.area();
    if (!area) return;
    this.dialogs
      .open<string | null>(new PolymorpheusComponent(AreaFormComponent), {
        label: this.translate.instant('areas.editTitle'),
        size: 'm',
        data: { areaData: { id: area.id, name: area.name, slug: area.slug } },
      })
      .subscribe({
        next: async (result) => {
          if (typeof result === 'string' && result.length) {
            if (isPlatformBrowser(this.platformId)) {
              if (result !== area.slug) {
                await this.router.navigateByUrl(`/area/${result}`);
                return;
              }
            }
          }
          await this.load(area.slug);
        },
      });
  }

  openCreateCrag(): void {
    const current = this.global.area();
    if (!current) return;
    // TODO: crag-form component
  }

  goBack(): void {
    if (!isPlatformBrowser(this.platformId)) {
      void this.router.navigateByUrl('/areas');
      return;
    }
    const target = this.resolveBackUrl();
    void this.router.navigateByUrl(target);
  }

  private resolveBackUrl(): '/explore' | '/areas' {
    let nav = this.router.lastSuccessfulNavigation?.previousNavigation ?? null;
    let steps = 0;
    while (nav && steps < 10) {
      const url = (nav.finalUrl ?? nav.initialUrl)?.toString() ?? '';
      if (url.startsWith('/explore')) return '/explore';
      if (url.startsWith('/areas')) return '/areas';
      nav = nav.previousNavigation ?? null;
      steps++;
    }
    return '/areas';
  }
}
