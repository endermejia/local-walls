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
import { GlobalData } from '../services';
import { Location } from '@angular/common';
import { ClimbingRoute } from '../models';
import { SectionHeaderComponent } from '../components/section-header';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiLoader } from '@taiga-ui/core';

@Component({
  selector: 'app-route',
  standalone: true,
  imports: [SectionHeaderComponent, TranslatePipe, TuiLoader],
  template: `
    <section class="w-full max-w-5xl mx-auto p-4">
      @if (route(); as r) {
        <app-section-header
          [title]="r.zlaggableName"
          [liked]="false"
          (back)="goBack()"
          (toggleLike)="global.toggleLikeRoute(r.zlaggableId)"
        />
        @if (r.difficulty) {
          <p class="mt-2 opacity-80">
            {{ 'labels.grade' | translate }}: {{ r.difficulty }}
          </p>
        }
      } @else {
        <div class="flex items-center justify-center w-full min-h-[50vh]">
          <tui-loader size="xxl"></tui-loader>
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
  zlaggableId: InputSignal<string> = input.required<string>();
  route: Signal<ClimbingRoute | null> = computed(() => this.global.route());

  constructor() {
    effect(() => {
      const countrySlug = this.countrySlug();
      const cragSlug = this.cragSlug();
      const sectorSlug = this.sectorSlug();
      const zlaggableId = this.zlaggableId();
      this.global.loadRoute(countrySlug, cragSlug, sectorSlug, zlaggableId);
    });
  }

  goBack(): void {
    this.location.back();
  }
}
