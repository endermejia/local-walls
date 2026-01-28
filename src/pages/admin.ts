import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiIcon, TuiTitle } from '@taiga-ui/core';
import { TuiHeader } from '@taiga-ui/layout';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterLink, TuiIcon, TuiHeader, TuiTitle, TranslatePipe],
  template: `
    <div class="p-4 flex flex-col gap-4 max-w-2xl mx-auto w-full">
      <header tuiHeader>
        <h1 tuiTitle>{{ 'config' | translate }}</h1>
      </header>

      <div class="grid gap-2">
        <a
          routerLink="/admin/users"
          class="flex items-center gap-4 p-4 bg-[var(--tui-background-base)] rounded-2xl border border-[var(--tui-border-normal)] no-underline text-inherit hover:bg-[var(--tui-background-neutral-1)]"
        >
          <tui-icon icon="@tui.users" />
          <span class="font-bold">{{ 'nav.admin-users' | translate }}</span>
        </a>

        <a
          routerLink="/admin/parkings"
          class="flex items-center gap-4 p-4 bg-[var(--tui-background-base)] rounded-2xl border border-[var(--tui-border-normal)] no-underline text-inherit hover:bg-[var(--tui-background-neutral-1)]"
        >
          <tui-icon icon="@tui.map-pin" />
          <span class="font-bold">{{ 'nav.admin-parkings' | translate }}</span>
        </a>

        <a
          routerLink="/admin/equippers"
          class="flex items-center gap-4 p-4 bg-[var(--tui-background-base)] rounded-2xl border border-[var(--tui-border-normal)] no-underline text-inherit hover:bg-[var(--tui-background-neutral-1)]"
        >
          <tui-icon icon="@tui.hammer" />
          <span class="font-bold">{{ 'nav.admin-equippers' | translate }}</span>
        </a>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminComponent {}

export default AdminComponent;
