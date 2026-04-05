import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { TuiAppearance } from '@taiga-ui/core';
import { TuiSkeleton } from '@taiga-ui/kit';

@Component({
  selector: 'app-ascent-card-skeleton',
  standalone: true,
  imports: [CommonModule, TuiAppearance, TuiSkeleton],
  template: `
    <div
      tuiAppearance="flat-grayscale"
      class="flex flex-col gap-1 p-4 sm:rounded-3xl rounded-none relative -mx-4 sm:mx-0 w-[calc(100%+2rem)] sm:w-full text-left"
    >
      <header class="flex justify-between items-start h-10 mb-2">
        <div class="flex items-center gap-3">
          @if (showUser()) {
            <div [tuiSkeleton]="true" class="w-8 h-8 rounded-full"></div>
            <div class="flex flex-col gap-1">
              <div [tuiSkeleton]="true" class="w-24 h-3 rounded-full"></div>
              <div
                [tuiSkeleton]="true"
                class="w-16 h-2 rounded-full opacity-60"
              ></div>
            </div>
          } @else {
            <div
              [tuiSkeleton]="true"
              class="w-20 h-2 rounded-full opacity-60"
            ></div>
          }
        </div>
        @if (showUser()) {
          <div
            [tuiSkeleton]="true"
            class="w-20 h-8 rounded-full opacity-50"
          ></div>
        }
      </header>

      @if (hasPhoto()) {
        <div
          [tuiSkeleton]="true"
          class="aspect-[4/3] w-full rounded-2xl opacity-20 mb-2"
        ></div>
      }

      <div class="flex flex-col gap-2">
        @if (showRoute()) {
          <div class="flex items-center gap-2">
            <div
              [tuiSkeleton]="true"
              class="w-5 h-5 rounded-md opacity-40"
            ></div>
            <div [tuiSkeleton]="true" class="w-48 h-5 rounded-full"></div>
            <span class="opacity-30">•</span>
            <div
              [tuiSkeleton]="true"
              class="w-24 h-3 rounded-full opacity-40"
            ></div>
          </div>
        }

        <div class="flex items-center gap-2">
          <div
            [tuiSkeleton]="true"
            class="w-10 h-6 rounded-full opacity-80"
          ></div>
          <div
            [tuiSkeleton]="true"
            class="w-16 h-5 rounded-full opacity-40"
          ></div>
          <div class="flex gap-0.5 ml-2">
            @for (i of [1, 2, 3, 4, 5]; track i) {
              <div
                [tuiSkeleton]="true"
                class="w-3 h-3 rounded-full opacity-30"
              ></div>
            }
          </div>
        </div>
      </div>

      <div
        class="flex flex-col gap-1 mt-3 pl-3 border-l-2 border-[var(--tui-border-normal)] opacity-40"
      >
        <div [tuiSkeleton]="true" class="w-full h-3 rounded-full"></div>
        <div [tuiSkeleton]="true" class="w-2/3 h-3 rounded-full"></div>
      </div>

      <footer class="flex gap-6 mt-4">
        <div class="flex items-center gap-2">
          <div
            [tuiSkeleton]="true"
            class="w-5 h-5 rounded-full opacity-50"
          ></div>
        </div>
        <div class="flex items-center gap-2">
          <div
            [tuiSkeleton]="true"
            class="w-5 h-5 rounded-full opacity-50"
          ></div>
        </div>
      </footer>
    </div>
  `,
  styles: [
    `
      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      :host {
        display: block;
        width: 100%;
        animation: fadeIn 0.4s ease-out;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AscentCardSkeletonComponent {
  showUser = input(true);
  showRoute = input(true);
  hasPhoto = input(false);
}
