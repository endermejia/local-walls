import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TuiTabs } from '@taiga-ui/kit';
import { TuiHeader } from '@taiga-ui/layout';
import { TuiTitle, TuiIcon } from '@taiga-ui/core';
import { TranslatePipe } from '@ngx-translate/core';
import { RouterLink } from '@angular/router';
import { SuggestedUnifiedAreasComponent } from '../components/admin/suggested-unified-areas';
import { SuggestedUnifiedCragsComponent } from '../components/admin/suggested-unified-crags';
import { SuggestedUnifiedRoutesComponent } from '../components/admin/suggested-unified-routes';

@Component({
  selector: 'app-admin-unify',
  imports: [
    CommonModule,
    RouterLink,
    TuiTabs,
    TuiHeader,
    TuiTitle,
    TuiIcon,
    TranslatePipe,
    SuggestedUnifiedAreasComponent,
    SuggestedUnifiedCragsComponent,
    SuggestedUnifiedRoutesComponent,
  ],
  template: `
    <div class="p-4 flex flex-col gap-4 max-w-2xl mx-auto w-full">
      <header tuiHeader>
        <h1 tuiTitle>
          <a
            routerLink="/admin"
            class="no-underline text-inherit flex items-center gap-2"
          >
            <tui-icon icon="@tui.arrow-left" />
            {{ 'admin.unifyTitle' | translate }}
          </a>
        </h1>
      </header>

      <tui-tabs
        [activeItemIndex]="activeTab()"
        (activeItemIndexChange)="activeTab.set($event)"
      >
        <button tuiTab>
          {{ 'areas' | translate }}
        </button>
        <button tuiTab>
          {{ 'crags' | translate }}
        </button>
        <button tuiTab>
          {{ 'routes' | translate }}
        </button>
      </tui-tabs>

      @switch (activeTab()) {
        @case (0) {
          <app-suggested-unified-areas />
        }
        @case (1) {
          <app-suggested-unified-crags />
        }
        @case (2) {
          <app-suggested-unified-routes />
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUnifyComponent {
  protected readonly activeTab = signal(0);
}
