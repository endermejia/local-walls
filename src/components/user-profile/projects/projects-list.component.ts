import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RoutesTableComponent } from '../../routes-table';
import { AscentCardSkeletonComponent } from '../../ascent-card-skeleton';
import { RouteWithExtras } from '../../../models/route.model';

@Component({
  selector: 'app-user-profile-projects-list',
  standalone: true,
  imports: [RoutesTableComponent, AscentCardSkeletonComponent],
  template: `
    @if (loading()) {
      <div class="grid gap-6 grid-cols-1 xl:grid-cols-2">
        @for (_ of [1, 2, 3, 4]; track $index) {
          <app-ascent-card-skeleton [showUser]="false" />
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
