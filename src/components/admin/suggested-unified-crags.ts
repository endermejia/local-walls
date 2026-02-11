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
import { CragSimple, CragsService } from '../../services/crags.service';
import { normalizeName } from '../../utils';
import { CragDto } from '../../models';

@Component({
  selector: 'app-suggested-unified-crags',
  imports: [CommonModule, TuiButton, TuiLoader, TranslatePipe],
  template: `
    <div class="flex flex-col gap-4">
      <h3 class="font-bold text-lg">
        {{ 'crags.suggestedDuplicates' | translate }}
      </h3>

      @if (cragsResource.isLoading()) {
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
                <div class="font-bold">
                  {{ group[0].name }}
                  <span class="font-normal opacity-70 text-sm">
                    ({{ getAreaName(group[0]) }})
                  </span>
                </div>
                <div class="text-sm opacity-70">
                  {{ group.length }} {{ 'labels.crags' | translate }} ({{
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
export class SuggestedUnifiedCragsComponent {
  private readonly cragsService = inject(CragsService);

  protected readonly cragsResource = resource({
    loader: () => this.cragsService.getAllCragsSimple(),
  });

  protected readonly duplicates = computed(() => {
    const crags = this.cragsResource.value() ?? [];
    const groups = new Map<string, CragSimple[]>();

    for (const crag of crags) {
      // Key includes area_id to avoid cross-area merging
      const key = `${crag.area_id}-${normalizeName(crag.name)}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(crag);
    }

    return Array.from(groups.values()).filter((g) => g.length > 1);
  });

  protected getAreaName(crag: CragSimple): string {
    return crag.area?.name || '';
  }

  protected getNames(group: CragSimple[]): string {
    return group.map((a) => a.name).join(', ');
  }

  protected async onUnify(group: CragSimple[]) {
    // Cast to CragDto[] for the service call
    const success = await this.cragsService.openUnifyCrags(
      group as unknown as CragDto[],
    );
    if (success) {
      this.cragsResource.reload();
    }
  }
}
