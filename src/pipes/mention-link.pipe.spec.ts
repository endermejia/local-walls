import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { MentionLinkPipe } from './mention-link.pipe';

describe('MentionLinkPipe', () => {
  let pipe: MentionLinkPipe;
  let sanitizer: DomSanitizer;

  beforeEach(() => {
    // Mock DomSanitizer
    const sanitizerMock = {
      bypassSecurityTrustHtml: (html: string) => html,
    };

    TestBed.configureTestingModule({
      providers: [
        MentionLinkPipe,
        { provide: DomSanitizer, useValue: sanitizerMock },
      ],
    });

    pipe = TestBed.inject(MentionLinkPipe);
    sanitizer = TestBed.inject(DomSanitizer);
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return empty string for null, undefined, or empty string', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
  });

  it('should replace a single mention with an anchor tag', () => {
    const text = 'Hello @[John Doe](123) !';
    const result = pipe.transform(text);
    expect(result).toBe('Hello <a class="mention-link font-bold hover:underline cursor-pointer text-[var(--tui-text-action)]" href="/profile/123" data-id="123">@John Doe</a> !');
  });

  it('should replace multiple mentions with anchor tags', () => {
    const text = '@[Alice](1) and @[Bob](2)';
    const result = pipe.transform(text);
    expect(result).toBe('<a class="mention-link font-bold hover:underline cursor-pointer text-[var(--tui-text-action)]" href="/profile/1" data-id="1">@Alice</a> and <a class="mention-link font-bold hover:underline cursor-pointer text-[var(--tui-text-action)]" href="/profile/2" data-id="2">@Bob</a>');
  });

  it('should escape HTML characters', () => {
    const text = '<script>alert(1)</script>';
    const result = pipe.transform(text);
    expect(result).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('should escape other special characters', () => {
    const text = 'A & B " C \' D';
    const result = pipe.transform(text);
    expect(result).toBe('A &amp; B &quot; C &#039; D');
  });

  it('should handle mentions alongside special characters', () => {
    const text = 'Hey @[User](123), "look" at <this> & that!';
    const result = pipe.transform(text);
    expect(result).toBe('Hey <a class="mention-link font-bold hover:underline cursor-pointer text-[var(--tui-text-action)]" href="/profile/123" data-id="123">@User</a>, &quot;look&quot; at &lt;this&gt; &amp; that!');
  });
});
