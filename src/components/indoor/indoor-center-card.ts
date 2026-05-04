import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiAvatar } from '@taiga-ui/kit';
import { TuiLink } from '@taiga-ui/core';

import { GlobalData } from '../../services/global-data';
import { SupabaseService } from '../../services/supabase.service';
import { IndoorCenterDto } from '../../models';
import { TranslateModule } from '@ngx-translate/core';
import { AppCardComponent } from '../ui/card';

@Component({
  selector: 'app-indoor-center-card',
  standalone: true,
  imports: [
    CommonModule,
    TuiAvatar,
    RouterLink,
    TranslateModule,
    AppCardComponent,
    TuiLink,
  ],
  template: `
    @let data = item();
    <app-card appearance="outline">
      <ng-container title>
        <a
          tuiLink
          [routerLink]="['/indoor', data.slug]"
          class="font-bold! block text-2xl! text-(--tui-text-primary)! whitespace-normal!"
        >
          {{ data.name }}
        </a>
      </ng-container>

      <div subtitle class="flex items-center gap-1 opacity-60">
        <span class="text-xs">
          {{ data.city }}{{ data.country ? ', ' + data.country : '' }}
        </span>
      </div>

      <div content class="flex flex-col gap-2 mt-1">
        <p class="text-sm text-(--tui-text-secondary) line-clamp-2">
          {{ data.description }}
        </p>
      </div>

      <div extra class="flex items-center">
        <span
          [tuiAvatar]="supabase.getPublicUrl('indoor-centers', data.avatar_url)"
          size="l"
          class="rounded-2xl"
        ></span>
      </div>
    </app-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndoorCenterCardComponent {
  protected readonly global = inject(GlobalData);
  protected readonly supabase = inject(SupabaseService);

  item = input.required<IndoorCenterDto>();
}
