import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Signal,
  signal,
  WritableSignal,
  input,
  effect,
  InputSignal,
} from '@angular/core';
import { Location } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiButton, TuiHint } from '@taiga-ui/core';
import { TuiSortDirection } from '@taiga-ui/addon-table';
import { SectionHeaderComponent } from '../components';
import { GlobalData } from '../services';

@Component({
  selector: 'app-topo',
  standalone: true,
  imports: [TranslatePipe, SectionHeaderComponent, TuiButton, TuiHint],
  template: `
    <div class="h-full w-full">
      <section class="w-full h-full max-w-5xl mx-auto p-4">
        <div class="flex gap-2">
          <app-section-header
            class="w-full  "
            [title]="cragSlug()"
            [liked]="false"
            (back)="goBack()"
            (toggleLike)="onToggleLike()"
          />
          <!-- Toggle image fit button -->
          @let imgFit = imageFit();
          <button
            tuiIconButton
            size="s"
            appearance="primary-grayscale"
            class="pointer-events-auto"
            [iconStart]="
              imgFit === 'cover'
                ? '@tui.unfold-horizontal'
                : '@tui.unfold-vertical'
            "
            [tuiHint]="
              global.isMobile()
                ? null
                : ((imgFit === 'cover'
                    ? 'actions.fit.contain'
                    : 'actions.fit.cover'
                  ) | translate)
            "
            (click.zoneless)="toggleImageFit()"
          >
            Toggle image fit
          </button>
        </div>

        <img
          [src]="global.iconSrc()('topo')"
          [alt]="cragSlug()"
          [class]="'w-full h-full overflow-visible ' + topoPhotoClass()"
          decoding="async"
        />
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow h-full sm:p-4' },
})
export class TopoComponent {
  protected readonly imageFit: WritableSignal<'cover' | 'contain'> =
    signal('cover');
  protected readonly topoPhotoClass: Signal<'object-cover' | 'object-contain'> =
    computed(() =>
      this.imageFit() === 'cover' ? 'object-cover' : 'object-contain',
    );

  protected readonly global = inject(GlobalData);
  private readonly location = inject(Location);

  // Route params (both /topo and /sector routes map here)
  countrySlug: InputSignal<string> = input.required();
  cragSlug: InputSignal<string> = input.required();
  id: InputSignal<string | undefined> = input();
  sectorSlug: InputSignal<string | undefined> = input();

  protected readonly direction: WritableSignal<TuiSortDirection> =
    signal<TuiSortDirection>(TuiSortDirection.Asc);

  constructor() {
    effect(() => {
      this.global.resetDataByPage('topo');
    });
  }

  onToggleLike(): void {
    this.global.toggleLikeCrag(this.cragSlug());
  }

  goBack(): void {
    this.location.back();
  }

  protected toggleImageFit(): void {
    this.imageFit.update((v) => (v === 'cover' ? 'contain' : 'cover'));
  }
}
