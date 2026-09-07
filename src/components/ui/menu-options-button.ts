import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';

import { TuiAppearance, TuiButton, TuiDropdown, TuiIcon } from '@taiga-ui/core';
import { TuiAvatar, TuiPulse, TuiSkeleton } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { MenuOptionsDropdownComponent } from './menu-options-dropdown';

@Component({
  selector: 'app-menu-options-button',
  imports: [
    MenuOptionsDropdownComponent,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiButton,
    TuiDropdown,
    TuiIcon,
    TuiPulse,
    TuiSkeleton,
  ],
  template: `
    <div
      [tuiDropdown]="optionsDropdown"
      [tuiDropdownDirection]="direction()"
      [tuiDropdownManual]="open()"
      class="block w-full"
    >
      @if (avatarMode()) {
        <button
          type="button"
          [tuiAppearance]="appearance()"
          class="flex items-center gap-4 p-3 rounded-xl transition-colors cursor-pointer select-none touch-manipulation w-fit md:w-full group relative"
          [tuiSkeleton]="loading()"
          (pointerdown)="onPointerDown($event)"
          (pointermove)="onPointerMove($event)"
          (pointerup)="onPointerUp()"
          (pointercancel)="onPointerCancel()"
          (pointerleave)="onPointerCancel()"
          (contextmenu)="onContextMenu($event)"
          (click)="onButtonClick($event)"
          [attr.aria-label]="label() || ('nav.profile' | translate)"
        >
          <span class="relative inline-flex">
            <span
              tuiAvatar
              [tuiSkeleton]="loading()"
              [class.ring-2]="isActive()"
              [class.ring-offset-2]="isActive()"
              [style.--tw-ring-color]="
                isActive() ? 'var(--tui-text-negative)' : ''
              "
              size="xs"
            >
              @if (avatarUrl()) {
                <img [src]="avatarUrl()" [alt]="userName() || ''" />
              } @else {
                <tui-icon
                  icon="@tui.user"
                  [style.color]="
                    isActive()
                      ? 'var(--tui-text-negative)'
                      : 'var(--tui-text-primary)'
                  "
                />
              }
            </span>
            @if (hasPulse()) {
              <span
                class="absolute bottom-0 left-0 pointer-events-none z-10 size-0"
              >
                <tui-pulse />
              </span>
            }
          </span>
          @if (label()) {
            <span
              class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden"
            >
              {{ label() }}
            </span>
          }
        </button>
      } @else if (iconOnly()) {
        <button
          [appearance]="appearance()"
          [size]="size()"
          tuiIconButton
          [iconStart]="icon()"
          [tuiSkeleton]="loading()"
          type="button"
          class="transition-colors"
          (click)="open.set(!open())"
        >
          <span class="tui-sr-only">{{ 'more' | translate }}</span>
        </button>
      } @else {
        <button
          type="button"
          [tuiAppearance]="appearance()"
          class="flex items-center gap-4 transition-colors p-3 rounded-xl w-full cursor-pointer no-underline text-inherit relative"
          [tuiSkeleton]="loading()"
          (click)="open.set(!open())"
        >
          <tui-icon [icon]="icon()" />
          <span
            class="hidden md:group-hover:block transition-opacity duration-300 whitespace-nowrap overflow-hidden text-sm"
          >
            {{ 'more' | translate }}
          </span>
        </button>
      }
    </div>

    <ng-template #optionsDropdown>
      <app-menu-options-dropdown
        [showNavigationOptions]="showNavigationOptions()"
        [showProfile]="avatarMode() || showProfile()"
        [showLogout]="shouldShowLogout()"
        (closeDropdown)="open.set(false)"
      />
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuOptionsButtonComponent {
  appearance = input<string>('flat-grayscale');
  size = input<'s' | 'm' | 'l'>('m');
  iconOnly = input<boolean>(false);
  avatarMode = input<boolean>(false);
  avatarUrl = input<string | null | undefined>(undefined);
  userName = input<string | null | undefined>(undefined);
  isActive = input<boolean>(false);
  hasPulse = input<boolean>(false);
  label = input<string>('');
  showNavigationOptions = input<boolean>(false);
  showProfile = input<boolean>(false);
  showLogout = input<boolean | undefined>(undefined);
  holdToOpen = input<boolean | undefined>(undefined);
  loading = input<boolean>(false);
  direction = input<'top' | 'bottom'>('top');
  icon = input<string>('@tui.menu');

  protected readonly shouldHoldToOpen = computed(
    () => this.holdToOpen() ?? this.avatarMode(),
  );

  protected readonly shouldShowLogout = computed(
    () => this.showLogout() ?? !this.avatarMode(),
  );

  protected open = signal(false);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly elementRef = inject(ElementRef);

  private holdTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private isHeld = false;
  private startX = 0;
  private startY = 0;
  private readonly HOLD_DURATION_MS = 400;
  private readonly MOVE_THRESHOLD_PX = 10;

  constructor() {
    this.destroyRef.onDestroy(() => this.clearHoldTimer());
  }

  protected onPointerDown(event: PointerEvent): void {
    if (!this.shouldHoldToOpen()) return;
    if (event.button !== 0) return;

    this.isHeld = false;
    this.startX = event.clientX;
    this.startY = event.clientY;

    this.clearHoldTimer();
    this.holdTimeoutId = setTimeout(() => {
      this.isHeld = true;
      this.open.set(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(40);
        } catch {
          // Ignore vibration error
        }
      }
    }, this.HOLD_DURATION_MS);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.shouldHoldToOpen() || !this.holdTimeoutId) return;

    const deltaX = Math.abs(event.clientX - this.startX);
    const deltaY = Math.abs(event.clientY - this.startY);

    if (deltaX > this.MOVE_THRESHOLD_PX || deltaY > this.MOVE_THRESHOLD_PX) {
      this.clearHoldTimer();
    }
  }

  protected onPointerUp(): void {
    if (!this.shouldHoldToOpen()) return;
    this.clearHoldTimer();
  }

  protected onPointerCancel(): void {
    this.clearHoldTimer();
  }

  protected onContextMenu(event: MouseEvent): void {
    if (this.shouldHoldToOpen()) {
      event.preventDefault();
      this.open.set(true);
    }
  }

  protected onButtonClick(event: MouseEvent): void {
    if (this.shouldHoldToOpen()) {
      if (this.isHeld) {
        event.preventDefault();
        event.stopPropagation();
        this.isHeld = false;
        return;
      }
      this.open.set(false);
      this.navigateToProfile();
    } else {
      this.open.set(!this.open());
    }
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    const target = event.target as HTMLElement | null;
    const hostEl = this.elementRef.nativeElement as HTMLElement;
    if (hostEl && !hostEl.contains(target)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open()) {
      this.open.set(false);
    }
  }

  private clearHoldTimer(): void {
    if (this.holdTimeoutId) {
      clearTimeout(this.holdTimeoutId);
      this.holdTimeoutId = null;
    }
  }

  protected navigateToProfile(): void {
    void this.router.navigate(['/profile']);
  }
}
