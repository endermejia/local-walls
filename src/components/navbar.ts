import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { TuiAppearance } from '@taiga-ui/core';
import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { GlobalData } from '../services/global-data';
import { ScrollService } from '../services/scroll.service';
import { TourService } from '../services/tour.service';
import { TourStep } from '../services/tour.service';

import { ChatDialogComponent } from '../dialogs/chat-dialog';
import { NotificationsDialogComponent } from '../dialogs/notifications-dialog';
import { TourHintComponent } from './tour-hint';
import { NavbarItemComponent } from './navbar-item';
import { NavbarSearchComponent } from './navbar-search';
import { NavbarMenuComponent } from './navbar-menu';

@Component({
  selector: 'app-navbar',
  host: {
    class: 'z-[100] relative md:w-20 md:h-full md:flex md:items-center',
  },
  imports: [
    RouterLink,
    TranslatePipe,
    TuiAppearance,
    TourHintComponent,
    NgOptimizedImage,
    NavbarItemComponent,
    NavbarSearchComponent,
    NavbarMenuComponent,
  ],
  template: `
    <aside
      class="w-full md:w-20 md:hover:w-64 md:h-full bg-[var(--tui-background-base)] transition-[width] duration-300 z-[100] group flex flex-col border-t md:border xl:border-none border-[var(--tui-border-normal)] md:absolute md:left-0 md:top-0 md:bottom-0 overflow-hidden sm:rounded-2xl"
      ngSkipHydration
    >
      <div
        class="flex md:flex-col justify-between w-full h-full p-2 md:p-4 gap-2 md:gap-4"
      >
        <!-- Desktop Logo -->
        <button
          class="hidden md:block shrink-0 rounded-xl transition-colors cursor-pointer w-fit"
          type="button"
          tuiAppearance="flat-grayscale"
          routerLink="/home"
        >
          <img
            ngSrc="/logo/climbeast.svg"
            alt="ClimBeast"
            [style.width.px]="46"
            [style.height.px]="35"
            width="46"
            height="35"
          />
        </button>

        <!-- Navigation Links (Middle) -->
        <nav
          class="w-full flex md:flex-col gap-2 md:gap-4 justify-around md:justify-start overflow-y-auto overflow-x-hidden my-auto"
        >
          <app-navbar-item
            link="/home"
            label="nav.home"
            icon="@tui.home"
            [exact]="true"
            [tourHintTemplate]="tourHint"
            [showTourHint]="
              tourService.isActive() && tourService.step() === TourStep.HOME
            "
            (itemClick)="scrollToTop($event)"
          />

          <app-navbar-item
            link="/explore"
            label="nav.explore"
            icon="@tui.map"
            [tourHintTemplate]="tourHint"
            [showTourHint]="
              tourService.isActive() && tourService.step() === TourStep.EXPLORE
            "
          />

          <app-navbar-item
            link="/area"
            label="nav.areas"
            icon="@tui.list"
            [tourHintTemplate]="tourHint"
            [showTourHint]="
              tourService.isActive() && tourService.step() === TourStep.AREAS
            "
          />

          @if (
            global.isAdmin() ||
            (global.isEquipper() && global.equipperAreas().length)
          ) {
            <app-navbar-item
              [link]="global.isAdmin() ? '/admin' : '/my-areas'"
              [label]="global.isAdmin() ? 'config' : 'nav.my-areas'"
              icon="@tui.cog"
            />
          }

          <app-navbar-search #navbarSearch [tourHintTemplate]="tourHint" />

          <app-navbar-item
            label="messages"
            icon="@tui.messages-square"
            [badgeCount]="global.unreadMessagesCount()"
            [hiddenMobile]="true"
            (itemClick)="openChat()"
          />

          <app-navbar-item
            label="notifications"
            icon="@tui.bell"
            [badgeCount]="global.unreadNotificationsCount()"
            [hiddenMobile]="true"
            (itemClick)="openNotifications()"
          />

          <app-navbar-item
            link="/profile"
            label="nav.profile"
            [avatar]="global.userAvatar()"
            [skeleton]="!global.userProfile()"
            class="lg:mt-auto"
          />
        </nav>

        <app-navbar-menu />
      </div>
    </aside>

    <ng-template #tourHint>
      <app-tour-hint
        [description]="tourDescription() | translate"
        (next)="onTourNext()"
        (skip)="tourService.finish()"
      />
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  protected readonly global = inject(GlobalData);
  protected readonly tourService = inject(TourService);
  protected readonly TourStep = TourStep;

  private readonly navbarSearch = viewChild(NavbarSearchComponent);

  protected readonly tourDescription = computed(() => {
    const step = this.tourService.step();
    switch (step) {
      case TourStep.EXPLORE:
        return 'tour.explore.description';
      case TourStep.AREAS:
        return 'tour.areas.description';
      case TourStep.SEARCH:
        return 'tour.search.description';
      case TourStep.HOME:
      default:
        return 'tour.home.description';
    }
  });

  private readonly router = inject(Router);
  private readonly scrollService = inject(ScrollService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);

  protected scrollToTop(event: MouseEvent): void {
    if (this.router.url === '/home') {
      event.preventDefault();
      this.scrollService.scrollToTop();
    }
  }

  protected onTourNext(): void {
    if (this.tourService.step() === TourStep.SEARCH) {
      this.navbarSearch()?.clearSearch();
    }
    this.tourService.next();
  }

  protected openChat(): void {
    void firstValueFrom(
      this.dialogs.open(new PolymorpheusComponent(ChatDialogComponent), {
        label: this.translate.instant('messages'),
        size: 'm',
      }),
      { defaultValue: undefined },
    );
  }

  protected openNotifications(): void {
    void firstValueFrom(
      this.dialogs.open(
        new PolymorpheusComponent(NotificationsDialogComponent),
        {
          label: this.translate.instant('notifications'),
          size: 'm',
        },
      ),
      { defaultValue: undefined },
    );
  }
}
