import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Signal,
  input,
  effect,
  InputSignal,
} from '@angular/core';
import { Location } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiLoader } from '@taiga-ui/core';
import { SectionHeaderComponent } from '../components';
import { GlobalData } from '../services';
import { RouteWithExtras } from '../models';

@Component({
  selector: 'app-route',
  standalone: true,
  imports: [SectionHeaderComponent, TranslatePipe, TuiLoader],
  template: `
    <section class="w-full max-w-5xl mx-auto p-4">
      @if (route(); as r) {
        <app-section-header
          [title]="r.name"
          [liked]="r.liked"
          (back)="goBack()"
          (toggleLike)="global.toggleLikeCrag('dummy')"
        />

        <!-- Meta: Country / Zone / Crag / Sector -->
        <div
          class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm opacity-80"
        >
          <div>
            <strong>{{ 'labels.grade' | translate }}:</strong>
            {{ r.grade }}
          </div>
          <div>
            <strong>{{ 'labels.height' | translate }}:</strong>
            {{ r.height }}m
          </div>
        </div>
      } @else {
        <div class="flex items-center justify-center w-full min-h-[50vh]">
          <tui-loader size="xxl" />
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow overflow-auto sm:p-4' },
})
export class RouteComponent {
  protected readonly global = inject(GlobalData);
  private readonly location = inject(Location);

  countrySlug: InputSignal<string> = input.required<string>();
  cragSlug: InputSignal<string> = input.required<string>();
  sectorSlug: InputSignal<string> = input.required<string>();
  zlaggableSlug: InputSignal<string> = input.required<string>();
  route: Signal<RouteWithExtras | null> = computed(() => null); // To be implemented with Supabase resource

  constructor() {
    effect(() => {
      // Supabase route loading logic will go here
    });
  }

  goBack(): void {
    this.location.back();
  }
}
