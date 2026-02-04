import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ScrollService {
  private readonly scrollToTopTrigger$ = new Subject<void>();
  readonly scrollToTop$ = this.scrollToTopTrigger$.asObservable();

  scrollToTop(): void {
    this.scrollToTopTrigger$.next();
  }
}
