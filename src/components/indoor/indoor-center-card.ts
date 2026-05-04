import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiAppearance, TuiButton } from '@taiga-ui/core';
import { TuiAvatar } from '@taiga-ui/kit';
import { TuiHeader } from '@taiga-ui/layout';

import { GlobalData } from '../../services/global-data';
import { SupabaseService } from '../../services/supabase.service';
import { IndoorCenterDto } from '../../models';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-indoor-center-card',
  standalone: true,
  imports: [
    CommonModule,
    TuiAppearance,
    TuiAvatar,
    TuiButton,
    TuiHeader,
    RouterLink,
    TranslateModule,
  ],
  template: `
    @let data = item();
    <div
      tuiAppearance="flat-grayscale"
      class="flex flex-col gap-1 p-4 sm:rounded-3xl rounded-none relative -mx-4 sm:mx-0 w-[calc(100%+2rem)] sm:w-full text-left overflow-hidden h-full shadow-sm hover:shadow-md transition-shadow"
    >
      <header tuiHeader class="mt-0! flex justify-between items-center">
        <div class="flex items-center gap-3">
          <span
            [tuiAvatar]="
              supabase.getPublicUrl('indoor-centers', data.avatar_url)
            "
            size="l"
            class="rounded-2xl"
          ></span>
          <div class="flex flex-col">
            <span class="font-bold text-lg leading-tight">
              {{ data.name }}
            </span>
            <span class="text-xs text-(--tui-text-secondary)">
              {{ data.city }}{{ data.country ? ', ' + data.country : '' }}
            </span>
          </div>
        </div>
      </header>

      <div class="flex flex-col gap-2 mt-2 grow">
        <p class="text-sm text-(--tui-text-secondary) line-clamp-2">
          {{ data.description }}
        </p>
      </div>

      <div class="flex gap-2 mt-4">
        <a
          tuiButton
          size="s"
          appearance="primary"
          class="grow rounded-xl!"
          [routerLink]="['/indoor', data.slug]"
        >
          {{ 'indoor.view_center' | translate }}
        </a>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndoorCenterCardComponent {
  protected readonly global = inject(GlobalData);
  protected readonly supabase = inject(SupabaseService);

  item = input.required<IndoorCenterDto>();
}
