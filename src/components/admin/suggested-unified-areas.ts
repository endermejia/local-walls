import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiButton, TuiLoader } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

import { AreasService } from '../../services/areas.service';

import { AreaDto } from '../../models';

import { normalizeName } from '../../utils';

@Component({
  selector: 'app-suggested-unified-areas',
  imports: [CommonModule, TranslatePipe, TuiButton, TuiLoader, RouterLink],
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
              class="border border-(--tui-border-normal) p-4 rounded-xl flex items-center justify-between gap-4"
            >
              <div class="flex-1 min-w-0">
                <div class="flex flex-col gap-1">
                  @for (area of group; track area.id) {
                    <div class="text-sm">
                      @if (area.slug) {
                        <a
                          [routerLink]="['/area', area.slug]"
                          target="_blank"
                          class="font-medium underline underline-offset-2 hover:opacity-70"
                          >{{ area.name }}</a
                        >
                      } @else {
                        <span class="font-medium">{{ area.name }}</span>
                      }
                    </div>
                  }
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
      groups.get(key)!.push(area as AreaDto);
    }

    return Array.from(groups.values()).filter((g) => g.length > 1);
  });

  protected async onUnify(group: AreaDto[]) {
    const success = await this.areasService.openUnifyAreas(group);
    if (success) {
      this.areasResource.reload();
    }
  }
}
