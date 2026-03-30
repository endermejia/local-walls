import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { PyramidComponent } from '../charts/pyramid';
import { GlobalData } from '../../services/global-data';
import { UserProfileProjectsListComponent } from './projects/projects-list';

@Component({
  selector: 'app-user-profile-projects',
  standalone: true,
  imports: [PyramidComponent, UserProfileProjectsListComponent],
  template: `
    <div class="flex flex-col gap-8 min-w-0">
      <app-pyramid [userId]="userId()" [startingYear]="startingYear()" />

      <app-user-profile-projects-list
        [projects]="projects()"
        [loading]="projectsResource.isLoading()"
      />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block w-full min-w-0',
  },
})
export class UserProfileProjectsComponent {
  userId = input.required<string>();
  startingYear = input<number | null | undefined>();

  protected readonly global = inject(GlobalData);
  readonly projectsResource = this.global.userProjectsResource;
  readonly projects = computed(() => this.projectsResource.value() ?? []);
}
