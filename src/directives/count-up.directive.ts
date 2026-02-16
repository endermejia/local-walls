import {
  Directive,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';

@Directive({
  selector: '[appCountUp]',
  standalone: true,
  exportAs: 'appCountUp',
})
export class CountUpDirective {
  private readonly destroyRef = inject(DestroyRef);

  // The target number to count up to
  readonly target = input.required<number>({ alias: 'appCountUp' });

  // Duration in ms
  readonly duration = input(800);

  // The current value for template binding
  readonly currentValue = signal(0);

  private animationFrameId: number | null = null;

  constructor() {
    effect(() => {
      const target = this.target();
      const duration = this.duration();

      untracked(() => {
        this.startAnimation(target, duration);
      });
    });

    this.destroyRef.onDestroy(() => {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
      }
    });
  }

  private startAnimation(end: number, durationMS: number) {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // Safety check for duration
    const duration = Math.max(0, durationMS);

    const start = this.currentValue();
    const range = end - start;
    const startTimeNumber = performance.now();

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTimeNumber;
      const progress = duration > 0 ? Math.min(elapsed / duration, 1) : 1;

      // Ease out quart: 1 - (1-x)^4
      const ease = 1 - Math.pow(1 - progress, 4);

      const nextValue = start + range * ease;

      if (progress < 1) {
        this.currentValue.set(nextValue);
        this.animationFrameId = requestAnimationFrame(step);
      } else {
        this.animationFrameId = null;
        this.currentValue.set(end); // Ensure exact final value
      }
    };

    if (duration <= 0) {
      this.currentValue.set(end);
    } else {
      this.animationFrameId = requestAnimationFrame(step);
    }
  }
}
