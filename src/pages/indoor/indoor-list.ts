import { LowerCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import {
  TuiAppearance,
  TuiButton,
  TuiLoader,
  TuiScrollbar,
  TuiInput,
  TuiTextfield,
  TuiLabel,
} from '@taiga-ui/core';
import { TuiAvatar } from '@taiga-ui/kit';

import { IndoorService } from '../../services/indoor.service';
import { GlobalData } from '../../services/global-data';
import { IndoorCenterCardComponent } from '../../components/indoor/indoor-center-card';
import { EmptyStateComponent } from '../../components/ui/empty-state';
import { matchesQuery } from '../../utils';

@Component({
  selector: 'app-indoor-list',
  standalone: true,
  imports: [
    IndoorCenterCardComponent,
    EmptyStateComponent,
    LowerCasePipe,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiButton,
    TuiInput,
    TuiLoader,
    TuiScrollbar,
    FormsModule,
    TuiTextfield,
    TuiLabel,
  ],
  template: `
    <div class="relative flex grow min-h-0">
      <tui-scrollbar class="flex grow">
        <section class="w-full max-w-5xl mx-auto p-4 pb-32">
          <header class="flex items-center justify-between gap-2">
            @let count = filtered().length;
            <h1 class="text-2xl font-bold w-full sm:w-auto">
              <span
                tuiAvatar="@tui.dumbbell"
                tuiThumbnail
                size="l"
                class="self-center"
                [attr.aria-label]="'indoor.title' | translate"
              ></span>
              {{ count }}
              {{ 'indoor.title' | translate | lowercase }}
            </h1>

            <div class="flex gap-2 flex-wrap sm:flex-nowrap justify-end">
              @if (global.canEditAsAdmin()) {
                <button
                  tuiButton
                  appearance="textfield"
                  size="s"
                  type="button"
                  (click.zoneless)="indoor.openIndoorCenterForm()"
                >
                  {{ 'new' | translate }}
                </button>
              }
            </div>
          </header>

          <div
            class="sticky top-0 z-10 py-4 flex items-end gap-2 bg-(--tui-background-base)"
          >
            <tui-textfield
              appearance="floating"
              tuiTextfieldSize="l"
              class="grow block"
            >
              <label tuiLabel for="indoor-search">{{
                'searchPlaceholder' | translate
              }}</label>
              <input
                tuiInput
                #indoorSearch
                id="indoor-search"
                type="text"
                autocomplete="off"
                [value]="query()"
                (input.zoneless)="query.set(indoorSearch.value)"
              />
            </tui-textfield>
          </div>

          @if (global.indoorCentersResource.isLoading()) {
            <tui-loader size="xxl" class="mt-20" />
          } @else {
            @if (count > 0) {
              <div
                class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mt-6"
              >
                @for (item of filtered(); track item.id) {
                  <app-indoor-center-card [item]="item" />
                }
              </div>
            } @else {
              <app-empty-state
                class="mt-12"
                [title]="'noResults' | translate"
              />
            }
          }
        </section>
      </tui-scrollbar>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow min-h-0' },
})
export class IndoorListComponent {
  protected readonly global = inject(GlobalData);
  protected readonly indoor = inject(IndoorService);

  protected readonly query = signal('');

  protected readonly filtered = computed(() => {
    const list = this.global.indoorCentersList();
    const q = this.query();

    if (!q) return list;

    return list.filter((item) =>
      matchesQuery(`${item.name} ${item.city || ''}`, q),
    );
  });
}
