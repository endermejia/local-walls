import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TuiAppearance, TuiIcon } from '@taiga-ui/core';
import { TuiRating, TuiSkeleton } from '@taiga-ui/kit';

@Component({
  selector: 'app-ascent-card-skeleton',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TuiAppearance,
    TuiIcon,
    TuiRating,
    TuiSkeleton,
  ],
  template: `
    <div
      tuiAppearance="flat-grayscale"
      class="flex flex-col gap-1 p-4 sm:rounded-3xl rounded-none relative -mx-4 sm:mx-0 w-(calc(100%+2rem)) sm:w-full text-left"
    >
      <header
        class="flex flex-wrap justify-between items-center gap-x-2 gap-y-0 min-h-10"
      >
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
          class="aspect-4/3 w-full rounded-2xl opacity-20 mb-2"
        ></div>
      }

      <div class="flex flex-col gap-1">
        <div class="flex flex-col gap-1">
          @if (showRoute()) {
            <div class="text-lg leading-tight">
              <tui-icon
                [tuiSkeleton]="true"
                class="w-5 h-5 opacity-40 rounded-full! align-text-bottom mr-1"
              />
              <div
                [tuiSkeleton]="true"
                class="w-48 h-5 rounded-full inline-block align-middle"
              ></div>
              <span class="opacity-30 mx-1.5 inline-block align-middle text-sm"
                >•</span
              >
              <div
                [tuiSkeleton]="true"
                class="w-24 h-3 rounded-full opacity-40 inline-block align-middle"
              ></div>
            </div>
          }

          <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <div
              [tuiSkeleton]="true"
              class="w-10 h-6 rounded-full opacity-80"
            ></div>
            <div
              [tuiSkeleton]="true"
              class="w-16 h-5 rounded-full opacity-40"
            ></div>
            <tui-rating
              [readOnly]="true"
              [ngModel]="5"
              [style.font-size.rem]="1"
              class="opacity-30 pointer-events-none"
            />
          </div>
        </div>
      </div>

      <footer class="flex flex-col gap-1 mt-2">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div class="flex items-center gap-2">
            <tui-icon
              icon="@tui.heart"
              [style.width.rem]="1.5"
              [style.height.rem]="1.5"
              class="opacity-30"
            />
          </div>
          <div class="flex items-center gap-2">
            <tui-icon
              icon="@tui.message-circle"
              [style.width.rem]="1.5"
              [style.height.rem]="1.5"
              class="opacity-30"
            />
          </div>
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
