import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { TuiSkeleton } from '@taiga-ui/kit';

import { RoutesTableComponent } from '../../route/routes-table';

import { RouteWithExtras } from '../../../models/route.model';

@Component({
  selector: 'app-user-profile-projects-list',
  standalone: true,
  imports: [RoutesTableComponent, TuiSkeleton],
  template: `
    @if (loading()) {
      <div class="grid gap-6 grid-cols-1 xl:grid-cols-2">
        @for (_ of [1, 2, 3, 4]; track $index) {
          <div
            class="p-6 rounded-3xl flex flex-col gap-4"
            tuiAppearance="outline"
          >
            <div [tuiSkeleton]="true" class="w-1/2 h-6 rounded-3xl"></div>
            <div
              [tuiSkeleton]="true"
              class="w-1/4 h-4 rounded-3xl opacity-60"
            ></div>
          </div>
        }
      </div>
    } @else {
      <app-routes-table
        [data]="projects()"
        [showAdminActions]="false"
        [showLocation]="true"
        [showRowColors]="false"
        [expandableMobile]="false"
        [hiddenColumns]="['topo', 'height', 'rating', 'ascents']"
      />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block w-full min-w-0',
  },
})
export class UserProfileProjectsListComponent {
  projects = input.required<RouteWithExtras[]>();
  loading = input<boolean>(false);
}
