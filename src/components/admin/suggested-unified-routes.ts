import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiAccordion } from '@taiga-ui/kit';
import { TuiButton, TuiLoader } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

import { RouteSimple, RoutesService } from '../../services/routes.service';

import { RouteDto } from '../../models';

@Component({
  selector: 'app-suggested-unified-routes',
  imports: [
    CommonModule,
    TranslatePipe,
    TuiAccordion,
    TuiButton,
    TuiLoader,
    RouterLink,
  ],
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
              <a
                [routerLink]="['/area', area.slug]"
                target="_blank"
                class="underline underline-offset-2 hover:opacity-70"
                (click)="$event.stopPropagation()"
                >{{ area.name }}</a
              >
              <span class="ml-2 font-normal opacity-50">
                ({{ area.duplicateGroups.length }}
                {{ 'routes.duplicateGroups' | translate }})
              </span>
            </button>
            <tui-expand>
              <div class="grid gap-3 pt-2 pb-6 px-1">
                @for (group of area.duplicateGroups; track $index) {
                  <div
                    class="border border-(--tui-border-normal) p-4 rounded-xl flex items-center justify-between gap-4"
                  >
                    <div class="flex-1 min-w-0">
                      <div class="font-bold">{{ group[0].name }}</div>
                      <div class="flex flex-col gap-1 mt-1">
                        @for (route of group; track route.id) {
                          <div class="text-sm opacity-70">
                            @if (
                              route.crag?.area_slug &&
                              route.crag?.slug &&
                              route.slug
                            ) {
                              <a
                                [routerLink]="[
                                  '/area',
                                  route.crag!.area_slug,
                                  route.crag!.slug,
                                  route.slug,
                                ]"
                                target="_blank"
                                class="underline underline-offset-2 hover:opacity-100"
                                >{{ route.crag?.name || 'Unknown' }}</a
                              >
                            } @else {
                              {{ route.crag?.name || 'Unknown' }}
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
            </tui-expand>
          }
        </tui-accordion>
      }

      @if (eightAnuResource.value()?.length) {
        <h3 class="font-bold text-lg mt-4">
          {{ 'routes.duplicatesByEightAnu' | translate }}
        </h3>
        @if (eightAnuResource.isLoading()) {
          <div class="flex justify-center p-8">
            <tui-loader size="xl" />
          </div>
        } @else {
          <div class="grid gap-2">
            @for (
              group of eightAnuResource.value()!;
              track group.eightAnuSlug
            ) {
              <div
                class="border border-(--tui-border-normal) p-4 rounded-xl flex items-center justify-between gap-4"
              >
                <div class="flex-1 min-w-0">
                  <div class="text-xs opacity-50 mb-1">
                    8a.nu: {{ group.eightAnuSlug }}
                  </div>
                  <div class="flex flex-col gap-1">
                    @for (route of group.routes; track route.id) {
                      <div class="text-sm">
                        @if (
                          route.crag?.area_slug &&
                          route.crag?.slug &&
                          route.slug
                        ) {
                          <a
                            [routerLink]="[
                              '/area',
                              route.crag!.area_slug,
                              route.crag!.slug,
                              route.slug,
                            ]"
                            target="_blank"
                            class="font-medium underline underline-offset-2 hover:opacity-70"
                            >{{ route.name }}</a
                          >
                        } @else {
                          <span class="font-medium">{{ route.name }}</span>
                        }
                        <span class="opacity-50 ml-1">
                          @if (route.crag?.area_slug) {
                            <a
                              [routerLink]="['/area', route.crag!.area_slug]"
                              target="_blank"
                              class="underline underline-offset-2 hover:opacity-100"
                              >{{
                                route.crag?.area_name || route.crag!.area_slug
                              }}</a
                            >
                          } @else {
                            {{ route.crag?.area_name || '?' }}
                          }
                          /
                          @if (route.crag?.area_slug && route.crag?.slug) {
                            <a
                              [routerLink]="[
                                '/area',
                                route.crag!.area_slug,
                                route.crag!.slug,
                              ]"
                              target="_blank"
                              class="underline underline-offset-2 hover:opacity-100"
                              >{{ route.crag?.name || 'Unknown' }}</a
                            >
                          } @else {
                            {{ route.crag?.name || 'Unknown' }}
                          }
                        </span>
                      </div>
                    }
                  </div>
                </div>
                <button
                  tuiButton
                  size="m"
                  appearance="primary"
                  (click)="onUnify(group.routes)"
                >
                  {{ 'unify' | translate }}
                </button>
              </div>
            }
          </div>
        }
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

  protected readonly eightAnuResource = resource({
    loader: () => this.routesService.getAllRoutesWithDuplicateEightAnuSlugs(),
  });

  protected async onUnify(group: RouteSimple[]) {
    const success = await this.routesService.openUnifyRoutes(
      group as unknown as RouteDto[],
    );
    if (success) {
      this.areasResource.reload();
      this.eightAnuResource.reload();
    }
  }
}
