import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  InputSignal,
  effect,
} from '@angular/core';
import { isPlatformBrowser, Location, LowerCasePipe } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TuiCardLarge } from '@taiga-ui/layout';
import { TuiSurface, TuiLoader, TuiTitle, TuiButton } from '@taiga-ui/core';
import { TuiAvatar, TUI_CONFIRM, type TuiConfirmData } from '@taiga-ui/kit';
import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { Router, RouterLink } from '@angular/router';
import { TuiHeader } from '@taiga-ui/layout';
import { AreasService, GlobalData } from '../services';
import {
  ChartRoutesByGradeComponent,
  SectionHeaderComponent,
} from '../components';
import { AreaFormComponent } from './area-form';

@Component({
  selector: 'app-area',
  standalone: true,
  imports: [
    TuiCardLarge,
    TranslatePipe,
    TuiSurface,
    TuiLoader,
    SectionHeaderComponent,
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
      @let area = global.selectedArea();
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
            <button
              size="s"
              appearance="neutral"
              iconStart="@tui.square-pen"
              tuiIconButton
              type="button"
              class="!rounded-full"
              (click.zoneless)="openEditArea()"
            >
              {{ 'common.edit' | translate }}
            </button>
            <button
              size="s"
              appearance="negative"
              iconStart="@tui.trash"
              tuiIconButton
              type="button"
              class="!rounded-full"
              (click.zoneless)="deleteArea()"
            >
              {{ 'common.delete' | translate }}
            </button>
          }
        </div>

        <div class="mb-2 flex justify-end">
          <app-chart-routes-by-grade [grades]="area.grades" />
        </div>

        <!-- Crags list -->
        @let crags = global.cragsList();
        @let cragsCount = crags.length;
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-2xl font-semibold mb-2">
            <tui-avatar
              tuiThumbnail
              size="l"
              [src]="global.iconSrc()('crag')"
              class="self-center"
              [attr.aria-label]="'labels.crag' | translate"
            />
            {{ cragsCount }}
            {{
              'labels.' + (cragsCount === 1 ? 'crag' : 'crags')
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
              (click)="openCreateCrag()"
            >
              {{ 'crags.new' | translate }}
            </button>
          }
        </div>
        <div class="grid gap-2 grid-cols-1 md:grid-cols-2">
          @for (crag of crags; track crag.slug) {
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
                    (click)="$event.stopPropagation()"
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
  private readonly location = inject(Location);

  areaSlug: InputSignal<string> = input.required<string>();

  constructor() {
    effect(() => {
      const slug = this.areaSlug();
      this.global.resetDataByPage('area');
      this.global.selectedAreaSlug.set(slug);
    });
  }

  onToggleLike(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const area = this.global.selectedArea();
    if (!area) return;
    void this.areas.toggleAreaLike(area.id);
  }

  deleteArea(): void {
    const area = this.global.selectedArea();
    if (!area) return;
    if (!isPlatformBrowser(this.platformId)) return;

    this.translate
      .get(['areas.deleteTitle', 'areas.deleteConfirm'], { name: area.name })
      .subscribe((t) => {
        const title = t['areas.deleteTitle'];
        const message = t['areas.deleteConfirm'];

        const data: TuiConfirmData = {
          content: message,
          yes: this.translate.instant('common.delete'),
          no: this.translate.instant('common.cancel'),
          appearance: 'accent',
        };

        this.dialogs
          .open<boolean>(TUI_CONFIRM, {
            label: title,
            size: 's',
            data,
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
    const area = this.global.selectedArea();
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
        },
      });
  }

  openCreateCrag(): void {
    const current = this.global.selectedArea();
    if (!current) return;
    // TODO: crag-form component
  }

  goBack(): void {
    this.location.back();
  }
}
