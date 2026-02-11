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
      class="flex flex-col gap-4 p-4 rounded-3xl w-full"
    >
      <header class="flex justify-between items-center h-10">
        <div class="flex items-center gap-3">
          @if (showUser()) {
            <div [tuiSkeleton]="true" class="w-10 h-10 rounded-full"></div>
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
          class="aspect-[3/4] w-full rounded-2xl opacity-20"
        ></div>
      }

      <div class="flex flex-col gap-1">
        @if (showRoute()) {
          <div class="flex items-center gap-2">
            <div [tuiSkeleton]="true" class="w-48 h-5 rounded-full"></div>
            <div
              [tuiSkeleton]="true"
              class="w-12 h-3 rounded-full opacity-50"
            ></div>
          </div>
          <div class="flex items-center gap-2">
            <div
              [tuiSkeleton]="true"
              class="w-32 h-3 rounded-full opacity-40"
            ></div>
          </div>
        }

        <div class="flex items-center gap-2 mt-1">
          <div
            [tuiSkeleton]="true"
            class="w-8 h-8 rounded-full opacity-80"
          ></div>
          <div [tuiSkeleton]="true" class="w-16 h-4 rounded opacity-40"></div>
          <div [tuiSkeleton]="true" class="w-24 h-3 rounded opacity-40"></div>
        </div>
      </div>

      <div class="flex flex-col gap-2 mt-2">
        <div
          [tuiSkeleton]="true"
          class="w-full h-3 rounded-full opacity-30"
        ></div>
        <div
          [tuiSkeleton]="true"
          class="w-2/3 h-3 rounded-full opacity-30"
        ></div>
      </div>

      <footer class="flex gap-4 mt-2">
        <div
          [tuiSkeleton]="true"
          class="w-12 h-6 rounded-full opacity-50"
        ></div>
        <div
          [tuiSkeleton]="true"
          class="w-12 h-6 rounded-full opacity-50"
        ></div>
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
