import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  TemplateRef,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { TranslatePipe } from '@ngx-translate/core';
import { TuiAppearance, TuiDropdown, TuiIcon } from '@taiga-ui/core';
import {
  TuiAvatar,
  TuiBadgeNotification,
  TuiBadgedContent,
  TuiPulse,
  TuiSkeleton,
} from '@taiga-ui/kit';

@Component({
  selector: 'app-navbar-item',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
    TuiAppearance,
    TuiIcon,
    TuiPulse,
    TuiBadgedContent,
    TuiBadgeNotification,
    TuiAvatar,
    TuiSkeleton,
    TuiDropdown,
  ],
  template: `
    @if (link()) {
      <a
        #rla="routerLinkActive"
        [routerLink]="link()"
        [routerLinkActiveOptions]="{ exact: exact() }"
        routerLinkActive
        [tuiAppearance]="rla.isActive ? 'flat-destructive' : 'flat-grayscale'"
        class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit rounded-xl transition-colors w-fit md:w-full relative"
        [class.hidden]="hiddenMobile()"
        [class.md:flex]="hiddenMobile()"
        [attr.aria-label]="label() | translate"
        (click)="itemClick.emit($event)"
      >
        <ng-container
          *ngTemplateOutlet="content; context: { isActive: rla.isActive }"
        ></ng-container>
      </a>
    } @else {
      <button
        type="button"
        tuiAppearance="flat-grayscale"
        class="flex items-center gap-4 p-3 md:p-3 no-underline text-inherit rounded-xl transition-colors w-fit md:w-full cursor-pointer relative"
        [class.hidden]="hiddenMobile()"
        [class.md:flex]="hiddenMobile()"
        [attr.aria-label]="label() | translate"
        (click)="itemClick.emit($event)"
      >
        <ng-container
          *ngTemplateOutlet="content; context: { isActive: false }"
        ></ng-container>
      </button>
    }

    <ng-template #content let-isActive="isActive">
      @if (tourHintTemplate()) {
        <div
          class="absolute inset-0 pointer-events-none"
          [tuiDropdown]="tourHintTemplate()!"
          [tuiDropdownManual]="showTourHint()"
          tuiDropdownDirection="bottom"
        ></div>
      }
      @if (showTourHint()) {
        <tui-pulse />
      }

      @if (badgeCount() !== undefined) {
        <tui-badged-content>
          @if (badgeCount()! > 0) {
            <tui-badge-notification
              tuiAppearance="accent"
              size="s"
              tuiSlot="top"
            >
              {{ badgeCount() }}
            </tui-badge-notification>
          }
          <tui-icon
            [icon]="icon() || ''"
            [style.color]="'var(--tui-text-primary)'"
          />
        </tui-badged-content>
      } @else if (avatar()) {
        <tui-avatar
          [src]="avatar() || '@tui.user'"
          [tuiSkeleton]="skeleton()"
          [class.ring-2]="isActive"
          [class.ring-offset-2]="isActive"
          [style.--tw-ring-color]="isActive ? 'var(--tui-text-negative)' : ''"
          size="xs"
        />
      } @else {
        <tui-icon [icon]="icon() || ''" />
      }

      <span
        class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden"
      >
        {{ label() | translate }}
      </span>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarItemComponent {
  readonly link = input<string | any[]>();
  readonly label = input.required<string>();
  readonly icon = input<string>();
  readonly badgeCount = input<number>();
  readonly avatar = input<string | null>();
  readonly skeleton = input<boolean>(false);
  readonly showTourHint = input<boolean>(false);
  readonly tourHintTemplate = input<TemplateRef<any> | null>(null);
  readonly exact = input<boolean>(false);
  readonly hiddenMobile = input<boolean>(false);

  readonly itemClick = output<MouseEvent>();
}
