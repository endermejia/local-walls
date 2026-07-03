import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  resource,
  computed,
} from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { GlobalData } from '../../services/global-data';

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
      @if (canEdit()) {
        <div class="flex justify-end px-3">
          <button
            tuiButton
            appearance="primary"
            size="s"
            iconStart="@tui.plus"
            (click.zoneless)="createRoute()"
          >
            {{ 'routes.create' | translate }}
          </button>
        </div>
      }

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
                    <div class="flex gap-1 justify-end items-center">
                      @if (canEdit()) {
                        <button
                          tuiIconButton
                          appearance="flat"
                          size="s"
                          iconStart="@tui.square-pen"
                          class="rounded-full!"
                          [attr.aria-label]="'edit' | translate"
                          (click.zoneless)="editRoute(route)"
                        ></button>
                        <button
                          tuiIconButton
                          appearance="flat"
                          size="s"
                          iconStart="@tui.trash"
                          class="rounded-full! text-red-500"
                          [attr.aria-label]="'delete' | translate"
                          (click.zoneless)="deleteRoute(route)"
                        ></button>
                      }
                      <button
                        tuiButton
                        appearance="flat"
                        size="s"
                        class="rounded-full!"
                      >
                        {{ 'ascent.new' | translate }}
                      </button>
                    </div>
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
  protected readonly global = inject(GlobalData);
  private readonly translate = inject(TranslateService);

  protected readonly canEdit = computed(() => {
    return this.global.indoorAdminPermissions()[this.centerId()];
  });

  protected readonly routes = computed<IndoorRouteDto[]>(
    () => this.routesResource.value() || [],
  );

  protected readonly routesResource = resource<IndoorRouteDto[], string>({
    params: () => this.centerId(),
    loader: ({ params: id }) => this.indoor.getCenterRoutes(id),
  });

  async createRoute(): Promise<void> {
    const success = await this.indoor.openIndoorRouteForm(this.centerId());
    if (success) {
      this.routesResource.reload();
    }
  }

  async editRoute(route: IndoorRouteDto): Promise<void> {
    const success = await this.indoor.openIndoorRouteForm(
      this.centerId(),
      route,
    );
    if (success) {
      this.routesResource.reload();
    }
  }

  async deleteRoute(route: IndoorRouteDto): Promise<void> {
    if (confirm(this.translate.instant('deleteCommentConfirm'))) {
      await this.indoor.deleteRoute(route.id);
      this.routesResource.reload();
    }
  }
}
