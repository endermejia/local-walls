import {
  ChangeDetectionStrategy,
  Component,
  input,
  inject,
  output,
} from '@angular/core';
import { CommonModule, LowerCasePipe } from '@angular/common';
import { TuiAvatar, TuiSkeleton, TUI_COUNTRIES } from '@taiga-ui/kit';
import { TuiIcon } from '@taiga-ui/core';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiCountryIsoCode } from '@taiga-ui/i18n';
import { AvatarUrlPipe } from '../../pipes/avatar-url.pipe';

@Component({
  selector: 'app-user-info',
  standalone: true,
  imports: [
    AvatarUrlPipe,
    CommonModule,
    LowerCasePipe,
    TranslatePipe,
    TuiAvatar,
    TuiIcon,
    TuiSkeleton,
  ],
  template: `
    <div class="flex items-start gap-4">
      <div class="relative">
        <span
          tuiAvatar
          [tuiSkeleton]="loading()"
          size="xxl"
          class="rounded-full! transition-transform"
          [class.cursor-pointer]="avatarClickable()"
          [class.hover:scale-105]="avatarClickable()"
          [class.active:scale-95]="avatarClickable()"
          [class.focus-visible:outline-(--tui-border-accent)]="
            avatarClickable()
          "
          [tabindex]="avatarClickable() ? 0 : -1"
          (click)="avatarClick.emit()"
          (keydown.enter)="avatarClick.emit()"
          (keydown.space)="$event.preventDefault(); avatarClick.emit()"
        >
          @if (avatar(); as photo) {
            <img [src]="photo | avatarUrl" [alt]="name() || ''" />
          } @else {
            <tui-icon [icon]="defaultIcon()" />
          }
        </span>
        <ng-content select="[badge]" />
      </div>

      <div class="grow min-w-0">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <h1
              class="text-xl font-semibold wrap-anywhere min-w-0"
              [tuiSkeleton]="loading() ? 'name lastName' : false"
            >
              {{ name() }}
            </h1>
            <ng-content select="[nameActions]" />
          </div>
        </div>

        <div class="flex items-center gap-x-2 flex-wrap">
          <span
            class="flex items-center gap-2"
            [tuiSkeleton]="loading() ? 'country, city' : false"
          >
            {{ country() ? countriesNames()[country()!] : ''
            }}{{ country() && city() ? ', ' : '' }}{{ city() || '' }}
          </span>
          @if (age(); as userAge) {
            |
            <span>
              {{ userAge }}
              {{ 'years' | translate | lowercase }}
            </span>
          }
          @if (startingClimbingYear(); as year) {
            <span class="opacity-70">
              |
              {{ 'startingClimbingYear' | translate }} {{ year }}
            </span>
          }
        </div>

        <div class="mt-2 opacity-80">
          <span
            class="wrap-anywhere"
            [tuiSkeleton]="
              loading()
                ? 'This text serves as the content behind the skeleton and adjusts the width.'
                : false
            "
          >
            {{ bio() }}
          </span>
        </div>

        <ng-content select="[extraInfo]" />
      </div>
    </div>

    @if (hasActions()) {
      <div class="flex flex-wrap gap-2 mt-4">
        <ng-content select="[actions]" />
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserInfoComponent {
  hasActions = input<boolean>(false);
  loading = input<boolean>(false);
  avatar = input<string | null | undefined>();
  name = input<string | null | undefined>();
  city = input<string | null | undefined>();
  country = input<TuiCountryIsoCode | null | undefined>();
  age = input<number | null | undefined>();
  startingClimbingYear = input<number | null | undefined>();
  bio = input<string | null | undefined>();

  defaultIcon = input<string>('@tui.user');
  avatarClickable = input<boolean>(false);

  avatarClick = output<void>();

  protected readonly countriesNames = inject(TUI_COUNTRIES);
}
