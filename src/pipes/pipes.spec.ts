import { TestBed } from '@angular/core/testing';

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { LanguageService } from '../services/language.service';
import { SupabaseService } from '../services/supabase.service';
import { ThemeService } from '../services/theme.service';

import { COMMON_TEST_PROVIDERS } from '../testing';
import { MockLanguageService } from '../testing/mock-language.service';
import { MockThemeService } from '../testing/mock-theme.service';
import { AnyToSchedulePipe } from './any-to-schedule.pipe';
import { AscentDatePipe } from './ascent-date.pipe';
import { AvatarUrlPipe } from './avatar-url.pipe';
import { IconSrcPipe } from './icon-src.pipe';
import { MentionLinkPipe } from './mention-link.pipe';
import { SanitizeHtmlPipe } from './sanitize-html.pipe';
import { ShadeInfoPipe } from './shade-info.pipe';
import { TableSorterPipe } from './table-sorter.pipe';
import { TopoImagePipe } from './topo-image.pipe';
import {
  TopoHasPathPipe,
  TopoIsTraversePipe,
  TopoPointStateBadgePipe,
  TopoPointStateColorPipe,
  TopoPointStateLabelPipe,
} from './topo-path.pipe';

describe('ShadeInfoPipe', () => {
  const pipe = new ShadeInfoPipe();

  it('returns null for null/undefined input', () => {
    expect(pipe.transform(null)).toBeNull();
    expect(pipe.transform(undefined)).toBeNull();
  });

  it('returns allDay for morning+afternoon', () => {
    const result = pipe.transform({
      shade_morning: true,
      shade_afternoon: true,
    });
    expect(result).toEqual({
      icon: '@tui.cloud-sun',
      label: 'filters.shade.allDay',
    });
  });

  it('returns morning for morning only', () => {
    const result = pipe.transform({
      shade_morning: true,
      shade_afternoon: false,
    });
    expect(result).toEqual({
      icon: '@tui.sunrise',
      label: 'filters.shade.morning',
    });
  });

  it('returns afternoon for afternoon only', () => {
    const result = pipe.transform({
      shade_morning: false,
      shade_afternoon: true,
    });
    expect(result).toEqual({
      icon: '@tui.sunset',
      label: 'filters.shade.afternoon',
    });
  });

  it('returns noShade for neither', () => {
    const result = pipe.transform({
      shade_morning: false,
      shade_afternoon: false,
    });
    expect(result).toEqual({
      icon: '@tui.sun',
      label: 'filters.shade.noShade',
    });
  });
});

describe('TopoHasPathPipe', () => {
  const pipe = new TopoHasPathPipe();

  it('returns true when route has points', () => {
    const map = new Map([
      [
        1,
        {
          points: [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
          ],
        },
      ],
    ]);
    expect(pipe.transform(1, map)).toBe(true);
  });

  it('returns false when route has empty points', () => {
    const map = new Map([[1, { points: [] }]]);
    expect(pipe.transform(1, map)).toBe(false);
  });

  it('returns false when route not in map', () => {
    const map = new Map<number, { points: { x: number; y: number }[] }>();
    expect(pipe.transform(1, map)).toBe(false);
  });
});

describe('TopoPointStateColorPipe', () => {
  const pipe = new TopoPointStateColorPipe();

  it('returns default color for undefined or neutral', () => {
    expect(pipe.transform(undefined, '#fff')).toBe('#fff');
    expect(pipe.transform('neutral', '#123456')).toBe('#123456');
  });

  it('returns state color for start, top, match, foot', () => {
    expect(pipe.transform('start')).toBe('#22C55E');
    expect(pipe.transform('top')).toBe('#EF4444');
    expect(pipe.transform('match')).toBe('#3B82F6');
    expect(pipe.transform('foot')).toBe('#EAB308');
  });
});

describe('TopoPointStateBadgePipe', () => {
  const pipe = new TopoPointStateBadgePipe();

  it('returns badge letter for start, top, match, foot', () => {
    expect(pipe.transform('start')).toBe('S');
    expect(pipe.transform('top')).toBe('T');
    expect(pipe.transform('match')).toBe('M');
    expect(pipe.transform('foot')).toBe('F');
  });

  it('returns empty string for neutral or undefined', () => {
    expect(pipe.transform('neutral')).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });
});

describe('TopoPointStateLabelPipe', () => {
  const pipe = new TopoPointStateLabelPipe();

  it('returns label for start, top, match, foot', () => {
    expect(pipe.transform('start')).toBe('START');
    expect(pipe.transform('top')).toBe('TOP');
    expect(pipe.transform('match')).toBe('MATCH');
    expect(pipe.transform('foot')).toBe('FOOT');
  });

  it('returns empty string for neutral or undefined', () => {
    expect(pipe.transform('neutral')).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });
});

describe('TopoIsTraversePipe', () => {
  const pipe = new TopoIsTraversePipe();

  it('returns true when route path has isTraverse: true', () => {
    const map = new Map([[1, { isTraverse: true }]]);
    expect(pipe.transform(1, map)).toBe(true);
  });

  it('returns false when isTraverse is false or path missing', () => {
    const map = new Map([[1, { isTraverse: false }]]);
    expect(pipe.transform(1, map)).toBe(false);
    expect(pipe.transform(2, map)).toBe(false);
  });
});

describe('AnyToSchedulePipe', () => {
  const pipe = new AnyToSchedulePipe();

  it('returns normal schedule and exceptions', () => {
    const input = {
      normal: { mon: '09:00-17:00' },
      exceptions: [{ date: '2024-01-01', closed: true }],
    };
    const result = pipe.transform(input);
    expect(result.normal).toEqual({ mon: '09:00-17:00' });
    expect(result.exceptions).toHaveLength(1);
  });

  it('returns defaults for null input', () => {
    const result = pipe.transform(null);
    expect(result.normal).toEqual({});
    expect(result.exceptions).toEqual([]);
  });

  it('returns defaults for undefined input', () => {
    const result = pipe.transform(undefined);
    expect(result.normal).toEqual({});
    expect(result.exceptions).toEqual([]);
  });
});

describe('TableSorterPipe', () => {
  const pipe = new TableSorterPipe();

  it('returns null for actions column', () => {
    expect(pipe.transform('actions')).toBeNull();
  });

  it('returns null for admin_actions column', () => {
    expect(pipe.transform('admin_actions')).toBeNull();
  });

  it('returns comparator for known columns', () => {
    expect(pipe.transform('grade')).toBeDefined();
    expect(pipe.transform('name')).toBeDefined();
    expect(pipe.transform('height')).toBeDefined();
    expect(pipe.transform('index')).toBeDefined();
  });

  it('returns null for unknown column', () => {
    expect(pipe.transform('unknown')).toBeNull();
  });
});

describe('AvatarUrlPipe (with DI)', () => {
  let pipe: AvatarUrlPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...COMMON_TEST_PROVIDERS, AvatarUrlPipe],
    });
    pipe = TestBed.inject(AvatarUrlPipe);
  });

  it('delegates to supabase.buildAvatarUrl', () => {
    expect(pipe.transform('test.jpg')).toContain('test.jpg');
  });

  it('returns empty for null path', () => {
    expect(pipe.transform(null)).toBe('');
  });
});

describe('IconSrcPipe (with DI)', () => {
  let pipe: IconSrcPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...COMMON_TEST_PROVIDERS,
        { provide: ThemeService, useClass: MockThemeService },
        IconSrcPipe,
      ],
    });
    pipe = TestBed.inject(IconSrcPipe);
  });

  it('returns path with theme suffix', () => {
    const result = pipe.transform('crag');
    expect(result).toContain('crag-');
    expect(result).toContain('.svg');
  });
});

describe('AscentDatePipe (with DI)', () => {
  let pipe: AscentDatePipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...COMMON_TEST_PROVIDERS,
        { provide: LanguageService, useClass: MockLanguageService },
        AscentDatePipe,
      ],
    });
    pipe = TestBed.inject(AscentDatePipe);
  });

  it('returns empty for null', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('returns empty for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });

  it('formats date string', () => {
    const result = pipe.transform('2024-06-15');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('returns raw string for invalid format', () => {
    expect(pipe.transform('not-a-date')).toBe('not-a-date');
  });

  it('formats date without year for current year', () => {
    const currentYear = new Date().getFullYear();
    const result = pipe.transform(`${currentYear}-06-15`);
    expect(result).toBeTruthy();
    expect(result).not.toContain(currentYear.toString());
  });
});

describe('SanitizeHtmlPipe (with DI)', () => {
  let pipe: SanitizeHtmlPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...COMMON_TEST_PROVIDERS, SanitizeHtmlPipe],
    });
    pipe = TestBed.inject(SanitizeHtmlPipe);
  });

  it('returns null for null input', () => {
    expect(pipe.transform(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(pipe.transform('')).toBeNull();
  });

  it('sanitizes HTML', () => {
    const result = pipe.transform('<p>Hello</p>');
    expect(result).toContain('Hello');
  });
});

describe('MentionLinkPipe (with DI)', () => {
  let pipe: MentionLinkPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...COMMON_TEST_PROVIDERS, MentionLinkPipe],
    });
    pipe = TestBed.inject(MentionLinkPipe);
  });

  it('returns empty string for null', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });

  it('leaves text without mentions unchanged', () => {
    const result = pipe.transform('hello world');
    expect(result).toContain('hello world');
  });

  it('converts mentions to links', () => {
    const result = pipe.transform('Hi @[John](user123) welcome') as string;
    expect(result).toContain('mention-link');
    expect(result).toContain('profile/user123');
    expect(result).toContain('@John');
  });
});

describe('TopoImagePipe (with DI)', () => {
  let pipe: TopoImagePipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...COMMON_TEST_PROVIDERS, TopoImagePipe],
    });
    pipe = TestBed.inject(TopoImagePipe);
  });

  it('calls getPublicUrl for indoor images', async () => {
    const result = await pipe.transform({
      path: 'indoor/photo.jpg',
      version: 1,
      isIndoor: true,
    });
    expect(result).toContain('indoor/photo.jpg');
  });

  it('uses thumbnail path when isThumbnail is true for indoor images', async () => {
    const result = await pipe.transform({
      path: 'indoor/photo.jpg',
      version: 1,
      isIndoor: true,
      isThumbnail: true,
    });
    expect(result).toContain('indoor/photo_thumb.webp');
  });

  it('calls getTopoSignedUrl for outdoor images', async () => {
    const result = await pipe.transform('topo/photo.jpg');
    expect(result).toContain('topo/photo.jpg');
  });

  it('uses thumbnail path when isThumbnail is true for outdoor images', async () => {
    const result = await pipe.transform({
      path: 'topos/123.png',
      version: 1,
      isIndoor: false,
      isThumbnail: true,
    });
    expect(result).toContain('topos/123_thumb.webp');
  });

  it('falls back to original photo when outdoor thumbnail cannot be signed', async () => {
    const supabase = TestBed.inject(SupabaseService);
    vi.spyOn(supabase, 'getTopoSignedUrl').mockImplementation(
      async (path: string | null | undefined) => {
        if (path && path.includes('_thumb')) return '';
        return path ? `https://example.com/${path}` : '';
      },
    );

    const result = await pipe.transform({
      path: 'topos/123.png',
      version: 1,
      isIndoor: false,
      isThumbnail: true,
    });
    expect(result).toBe('https://example.com/topos/123.png');
  });

  it('handles null path', async () => {
    const result = await pipe.transform(null);
    expect(result).toBe('');
  });
});
