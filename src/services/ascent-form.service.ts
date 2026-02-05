import { inject, Injectable } from '@angular/core';
import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TranslateService } from '@ngx-translate/core';
import { Observable, tap } from 'rxjs';

import { AscentDialogData } from '../models';
import AscentFormComponent from '../forms/ascent-form';
import { AscentsService } from './ascents.service';

@Injectable({ providedIn: 'root' })
export class AscentFormService {
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly ascentsService = inject(AscentsService);

  openAscentForm(data: AscentDialogData): Observable<boolean> {
    return this.dialogs
      .open<boolean>(new PolymorpheusComponent(AscentFormComponent), {
        label: this.translate.instant(
          data.ascentData ? 'ascent.edit' : 'ascent.new',
        ),
        size: 'm',
        data,
        dismissible: false,
      })
      .pipe(
        tap((res) => {
          if (res === null || res) {
            void this.ascentsService.refreshResources();
          }
        }),
      );
  }
}
