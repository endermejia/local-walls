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
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TuiCardLarge } from '@taiga-ui/layout';
import { TuiSurface, TuiLoader } from '@taiga-ui/core';
import { AreasService, GlobalData } from '../services';
import type { AreaDto } from '../models/supabase-tables.dto';
import { SectionHeaderComponent } from '../components/section-header';
import { TuiBadge } from '@taiga-ui/kit';
import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { AreaFormComponent } from './area-form';
import { Router } from '@angular/router';
import { ConfirmDialogComponent } from '../components/confirm-dialog';

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
            [liked]="global.liked()"
            (back)="goBack()"
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

        <div tuiCardLarge [tuiSurface]="'neutral'" class="p-4">
          <p class="mt-2 opacity-70">
            {{ 'areas.detail_placeholder' | translate }}
          </p>
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
  readonly area: WritableSignal<AreaDto | null> = signal<AreaDto | null>(null);

  constructor() {
    effect(() => {
      // Track slug changes to reload data when navigating within the same component
      const slug = this.areaSlug();
      void this.load(slug);
    });
  }

  private async load(slug: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    const data = await this.areas.getBySlug(slug);
    this.area.set(data);
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
              } catch (e) {
                // Error already logged in service
              }
            },
          });
      });
  }

  goBack(): void {
    this.router.navigateByUrl('/areas');
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
          // When editing name/slug, dialog returns the new slug (string)
          if (typeof result === 'string' && result.length) {
            if (isPlatformBrowser(this.platformId)) {
              if (result !== current.slug) {
                await this.router.navigateByUrl(`/area/${result}`);
                return;
              }
            }
          }
          // Fallback: just reload current data
          await this.load(current.slug);
        },
      });
  }
}
