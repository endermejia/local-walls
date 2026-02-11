import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TuiButton, TuiLoader } from '@taiga-ui/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AreasService } from '../../services';
import { normalizeName } from '../../utils';
import { AreaDto } from '../../models';

@Component({
  selector: 'app-suggested-unified-areas',
  imports: [CommonModule, TuiButton, TuiLoader, TranslatePipe],
  template: `
    <div class="flex flex-col gap-4">
      <h3 class="font-bold text-lg">
        {{ 'areas.suggestedDuplicates' | translate }}
      </h3>

      @if (areasResource.isLoading()) {
        <div class="flex justify-center p-4">
          <tui-loader class="m-auto" />
        </div>
      } @else if (duplicates().length === 0) {
        <p class="opacity-70">{{ 'admin.noDuplicatesFound' | translate }}</p>
      } @else {
        <div class="grid gap-2">
          @for (group of duplicates(); track $index) {
            <div
              class="border border-[var(--tui-border-normal)] p-4 rounded-xl flex items-center justify-between gap-4"
            >
              <div>
                <div class="font-bold">{{ group[0].name }}</div>
                <div class="text-sm opacity-70">
                  {{ group.length }} {{ 'labels.areas' | translate }} ({{
                    getNames(group)
                  }})
                </div>
              </div>
              <button
                tuiButton
                size="m"
                appearance="primary"
                (click)="onUnify(group)"
              >
                {{ 'actions.unify' | translate }}
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuggestedUnifiedAreasComponent {
  private readonly areasService = inject(AreasService);

  protected readonly areasResource = resource({
    loader: () => this.areasService.getAllAreasSimple(),
  });

  protected readonly duplicates = computed(() => {
    const areas = this.areasResource.value() ?? [];
    const groups = new Map<string, AreaDto[]>();

    for (const area of areas) {
      const key = normalizeName(area.name);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(area as unknown as AreaDto);
    }

    return Array.from(groups.values()).filter((g) => g.length > 1);
  });

  protected getNames(group: AreaDto[]): string {
    return group.map((a) => a.name).join(', ');
  }

  protected async onUnify(group: AreaDto[]) {
    const success = await this.areasService.openUnifyAreas(group);
    if (success) {
      this.areasResource.reload();
    }
  }
}
