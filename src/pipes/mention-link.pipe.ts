import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MENTION_PATTERN } from '../utils';

@Pipe({
  name: 'mentionLink',
  standalone: true,
})
export class MentionLinkPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: string | null | undefined): SafeHtml {
    if (!value) return '';

    // 1. Escape HTML characters to prevent XSS (since we are using innerHTML)
    const escaped = this.escapeHtml(value);

    // 2. Replace mentions with anchor tags
    // Reset lastIndex since MENTION_PATTERN is a global regex
    MENTION_PATTERN.lastIndex = 0;

    const linked = escaped.replace(MENTION_PATTERN, (match, name, id) => {
      // We use a specific class 'mention-link' to target click events if needed
      // and data-id attribute.
      // We also use href for standard behavior/SEO, but the app should intercept it.
      return `<a class="mention-link font-bold hover:underline cursor-pointer text-[var(--tui-text-action)]" href="/profile/${id}" data-id="${id}">@${name}</a>`;
    });

    return this.sanitizer.bypassSecurityTrustHtml(linked);
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
