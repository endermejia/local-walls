import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  output,
} from '@angular/core';

@Component({
  selector: 'app-infinite-scroll-trigger',
  template: '<div class="h-1 w-full"></div>',
})
export class InfiniteScrollTriggerComponent
  implements AfterViewInit, OnDestroy
{
  private el = inject(ElementRef);
  intersect = output<void>();
  private observer?: IntersectionObserver;

  ngAfterViewInit() {
    this.observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        this.intersect.emit();
      }
    });
    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }
}
