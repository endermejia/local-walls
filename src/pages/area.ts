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
import { isPlatformBrowser, Location } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiCardLarge } from '@taiga-ui/layout';
import { TuiSurface, TuiLoader } from '@taiga-ui/core';
import { AreasService, GlobalData } from '../services';
import type { AreaDto } from '../models/supabase-tables.dto';
import { SectionHeaderComponent } from '../components/section-header';
import { TuiBadge } from '@taiga-ui/kit';

@Component({
  selector: 'app-area',
  standalone: true,
  imports: [
    RouterLink,
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
              [routerLink]="['/area', area()!.slug, 'edit']"
              [attr.aria-label]="'common.edit' | translate"
              [attr.title]="'common.edit' | translate"
            />
            <tui-badge
              class="cursor-pointer"
              appearance="neutral"
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
  private readonly location = inject(Location);

  areaSlug: InputSignal<string> = input.required<string>();
  readonly area: WritableSignal<AreaDto | null> = signal<AreaDto | null>(null);

  isAdmin = () => this.global.isAdmin();

  constructor() {
    effect(() => {
      void this.load();
    });
  }

  private async load(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    const slug = this.areaSlug();
    const data = await this.areas.getBySlug(slug);
    this.area.set(data);
  }

  deleteArea(): void {
    // TODO: Implement delete area action
  }

  goBack(): void {
    this.location.back();
  }
}
