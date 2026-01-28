import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { TuiDialogContext, TuiLoader } from '@taiga-ui/core';
import { TuiProgress } from '@taiga-ui/kit';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

import { type Observable } from 'rxjs';

export interface LoaderData {
  message: string;
  progress$?: Observable<number>;
}

@Component({
  imports: [AsyncPipe, TuiLoader, TuiProgress],
  template: `
    <div class="flex flex-col items-center justify-center p-4 gap-4">
      @if (data.progress$; as progress$) {
        <progress
          max="100"
          tuiProgressBar
          [value]="progress$ | async"
          class="w-full"
        ></progress>
      } @else {
        <tui-loader size="xl" />
      }
      <div class="tui-text_body-m text-center">{{ data.message }}</div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoaderDialogComponent {
  readonly context =
    inject<TuiDialogContext<void, LoaderData | string>>(POLYMORPHEUS_CONTEXT);

  protected get data(): LoaderData {
    return typeof this.context.data === 'string'
      ? { message: this.context.data }
      : this.context.data;
  }
}
