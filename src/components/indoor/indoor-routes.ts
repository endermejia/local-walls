import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  resource,
  computed,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { TuiLoader, TuiButton } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';

import { IndoorService } from '../../services/indoor.service';
import { IndoorRouteDto } from '../../models';
import { GradeComponent } from '../ui/avatar-grade';

@Component({
  selector: 'app-indoor-routes',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    TuiLoader,
    TuiBadge,
    TuiButton,
    GradeComponent,
  ],
  template: `
    <div class="flex flex-col gap-4">
      @if (routes().length > 0) {
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-neutral-200 dark:border-neutral-800">
                <th class="p-3 font-bold">{{ 'grade' | translate }}</th>
                <th class="p-3 font-bold">{{ 'name' | translate }}</th>
                <th class="p-3 font-bold">{{ 'type' | translate }}</th>
                <th class="p-3 font-bold text-right">
                  {{ 'actions' | translate }}
                </th>
              </tr>
            </thead>
            <tbody>
              @for (route of routes(); track route.id) {
                <tr
                  class="border-b border-neutral-100 dark:border-neutral-900 last:border-0"
                >
                  <td class="p-3">
                    <app-grade
                      [grade]="route.grade || 0"
                      [kind]="route.climbing_kind"
                    />
                  </td>
                  <td class="p-3 font-bold">
                    {{ route.name }}
                    @if (route.legacy) {
                      <span
                        tuiBadge
                        size="s"
                        appearance="neutral"
                        class="ml-2 uppercase text-[10px]"
                      >
                        {{ 'indoor.legacy' | translate }}
                      </span>
                    }
                  </td>
                  <td class="p-3 text-sm opacity-70 uppercase">
                    {{ route.climbing_kind }}
                  </td>
                  <td class="p-3 text-right">
                    <button
                      tuiButton
                      appearance="flat"
                      size="s"
                      class="rounded-full!"
                    >
                      {{ 'ascent.new' | translate }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else if (routesResource.isLoading()) {
        <tui-loader />
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndoorRoutesComponent {
  centerId = input.required<string>();

  protected readonly indoor = inject(IndoorService);
  protected readonly routes = computed<IndoorRouteDto[]>(
    () => this.routesResource.value() || [],
  );

  protected readonly routesResource = resource<IndoorRouteDto[], string>({
    params: () => this.centerId(),
    loader: ({ params: id }) => this.indoor.getCenterRoutes(id),
  });
}
