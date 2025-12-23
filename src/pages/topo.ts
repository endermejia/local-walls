import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Signal,
  signal,
  WritableSignal,
  input,
  effect,
  InputSignal,
  PLATFORM_ID,
} from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TuiButton, TuiHint, TuiLoader, TuiLink } from '@taiga-ui/core';
import { TuiTable } from '@taiga-ui/addon-table';
import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { SectionHeaderComponent } from '../components';
import { GlobalData } from '../services';
import {
  VERTICAL_LIFE_TO_LABEL,
  VERTICAL_LIFE_GRADES,
  TopoDetail,
} from '../models';
import TopoFormComponent from './topo-form';

@Component({
  selector: 'app-topo',
  standalone: true,
  imports: [
    TranslatePipe,
    SectionHeaderComponent,
    TuiButton,
    TuiHint,
    TuiTable,
    TuiLoader,
    TuiLink,
  ],
  template: `
    <div class="h-full w-full">
      <section class="w-full h-full max-w-5xl mx-auto p-4">
        @if (topo(); as t) {
          <div class="flex gap-2">
            <app-section-header
              class="w-full"
              [title]="t.name"
              [liked]="false"
              (back)="goBack()"
              (toggleLike)="onToggleLike()"
            />
            @if (global.isAdmin()) {
              <button
                tuiIconButton
                size="s"
                appearance="primary"
                iconStart="@tui.square-pen"
                class="pointer-events-auto"
                (click.zoneless)="openEditTopo(t)"
              >
                {{ 'actions.edit' | translate }}
              </button>
            }
            <!-- Toggle image fit button -->
            @let imgFit = imageFit();
            <button
              tuiIconButton
              size="s"
              appearance="primary-grayscale"
              class="pointer-events-auto"
              [iconStart]="
                imgFit === 'cover'
                  ? '@tui.unfold-horizontal'
                  : '@tui.unfold-vertical'
              "
              [tuiHint]="
                global.isMobile()
                  ? null
                  : ((imgFit === 'cover'
                      ? 'actions.fit.contain'
                      : 'actions.fit.cover'
                    ) | translate)
              "
              (click.zoneless)="toggleImageFit()"
            >
              Toggle image fit
            </button>
          </div>

          <div
            class="relative w-full aspect-video mt-4 overflow-hidden rounded shadow-lg bg-black/10"
          >
            <img
              [src]="t.photo || global.iconSrc()('topo')"
              [alt]="t.name"
              [class]="'w-full h-full ' + topoPhotoClass()"
              decoding="async"
            />
          </div>

          <div class="mt-6">
            <h2 class="text-2xl font-semibold mb-4">
              {{ 'labels.routes' | translate }}
            </h2>
            <table tuiTable class="w-full" [columns]="columns">
              <thead>
                <tr tuiThGroup>
                  <th tuiTh [sorter]="null">#</th>
                  <th tuiTh [sorter]="null">{{ 'routes.name' | translate }}</th>
                  <th tuiTh [sorter]="null">
                    {{ 'labels.grade' | translate }}
                  </th>
                  <th tuiTh [sorter]="null">
                    {{ 'routes.height' | translate }}
                  </th>
                </tr>
              </thead>
              <tbody tuiTbody [data]="t.topo_routes">
                @for (tr of t.topo_routes; track tr.route_id) {
                  <tr tuiTr>
                    <td tuiTd>{{ tr.number + 1 }}</td>
                    <td tuiTd>
                      <button
                        tuiLink
                        type="button"
                        class="text-left"
                        (click)="goToRoute(tr.route.slug)"
                      >
                        {{ tr.route.name }}
                      </button>
                    </td>
                    <td tuiTd>{{ gradeStringify(tr.route.grade) }}</td>
                    <td tuiTd>
                      {{ tr.route.height ? tr.route.height + 'm' : '-' }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="flex items-center justify-center h-full">
            <tui-loader size="xxl" />
          </div>
        }
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow h-full sm:p-4' },
})
export class TopoComponent {
  protected readonly imageFit: WritableSignal<'cover' | 'contain'> =
    signal('cover');
  protected readonly topoPhotoClass: Signal<'object-cover' | 'object-contain'> =
    computed(() =>
      this.imageFit() === 'cover' ? 'object-cover' : 'object-contain',
    );

  protected readonly global = inject(GlobalData);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly platformId = inject(PLATFORM_ID);

  // Route params
  countrySlug: InputSignal<string> = input.required();
  areaSlug: InputSignal<string> = input.required();
  cragSlug: InputSignal<string> = input.required();
  id: InputSignal<string | undefined> = input();
  sectorSlug: InputSignal<string | undefined> = input();

  protected readonly topo = this.global.topoDetailResource.value;
  protected readonly columns = ['index', 'name', 'grade', 'height'];

  constructor() {
    effect(() => {
      this.global.resetDataByPage('topo');
      const topoId = this.id();
      if (topoId) {
        this.global.selectedTopoId.set(topoId);
      }
    });
  }

  gradeStringify(grade: number): string {
    return (
      VERTICAL_LIFE_TO_LABEL[grade as VERTICAL_LIFE_GRADES] || grade.toString()
    );
  }

  onToggleLike(): void {
    this.global.toggleLikeCrag(this.cragSlug());
  }

  goBack(): void {
    this.location.back();
  }

  protected toggleImageFit(): void {
    this.imageFit.update((v) => (v === 'cover' ? 'contain' : 'cover'));
  }

  goToRoute(routeSlug: string): void {
    void this.router.navigate([
      '/area',
      this.areaSlug(),
      this.cragSlug(),
      'route',
      routeSlug,
    ]);
  }

  openEditTopo(topo: TopoDetail): void {
    const initialRouteIds = topo.topo_routes.map((tr) => tr.route_id);
    this.dialogs
      .open<string | null>(new PolymorpheusComponent(TopoFormComponent), {
        label: this.translate.instant('topos.editTitle'),
        size: 'l',
        data: {
          topoData: topo,
          initialRouteIds,
        },
      })
      .subscribe();
  }
}
