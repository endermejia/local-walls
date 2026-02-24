import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
} from '@angular/core';

import { TuiButton, TuiLoader } from '@taiga-ui/core';
import { TuiAccordion } from '@taiga-ui/experimental';

import { TranslatePipe } from '@ngx-translate/core';

import { RouteSimple, RoutesService } from '../../services/routes.service';

import { RouteDto } from '../../models';

@Component({
  selector: 'app-suggested-unified-routes',
  imports: [CommonModule, TuiButton, TuiLoader, TuiAccordion, TranslatePipe],
  template: `
    <div class="flex flex-col gap-4">
      <h3 class="font-bold text-lg">
        {{ 'routes.suggestedDuplicates' | translate }}
      </h3>

      @if (areasResource.isLoading()) {
        <div class="flex justify-center p-8">
          <tui-loader size="xl" />
        </div>
      } @else if (areas().length === 0) {
        <p class="opacity-70">{{ 'admin.noDuplicatesFound' | translate }}</p>
      } @else {
        <tui-accordion [closeOthers]="false">
          @for (area of areas(); track area.id) {
            <button tuiAccordion class="font-bold">
              {{ area.name }}
              <span class="ml-2 font-normal opacity-50">
                ({{ area.duplicateGroups.length }}
                {{ 'routes.duplicateGroups' | translate }})
              </span>
            </button>
            <tui-expand>
              <div class="grid gap-3 pt-2 pb-6 px-1">
                @for (group of area.duplicateGroups; track $index) {
                  <div
                    class="border border-[var(--tui-border-normal)] p-4 rounded-xl flex items-center justify-between gap-4"
                  >
                    <div>
                      <div class="font-bold">
                        {{ group[0].name }}
                      </div>
                      <div class="text-sm opacity-70">
                        {{ group.length }} {{ 'routes' | translate }} ({{
                          getCragNames(group)
                        }})
                      </div>
                    </div>
                    <button
                      tuiButton
                      size="m"
                      appearance="primary"
                      (click)="onUnify(group)"
                    >
                      {{ 'unify' | translate }}
                    </button>
                  </div>
                }
              </div>
            </tui-expand>
          }
        </tui-accordion>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuggestedUnifiedRoutesComponent {
  private readonly routesService = inject(RoutesService);

  protected readonly areasResource = resource({
    loader: () => this.routesService.getAllDuplicateRoutesGroupedByArea(),
  });
  protected readonly areas = computed(() => this.areasResource.value() ?? []);

  protected getCragNames(group: RouteSimple[]): string {
    return group.map((a) => a.crag?.name || 'Unknown').join(', ');
  }

  protected async onUnify(group: RouteSimple[]) {
    const success = await this.routesService.openUnifyRoutes(
      group as unknown as RouteDto[],
    );
    if (success) {
      this.areasResource.reload();
    }
  }
}
