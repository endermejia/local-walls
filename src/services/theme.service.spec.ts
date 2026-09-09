import { TestBed } from '@angular/core/testing';

import { describe, it, expect, beforeEach } from 'vitest';

import { Themes } from '../models';

import { COMMON_TEST_PROVIDERS } from '../testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ThemeService, ...COMMON_TEST_PROVIDERS],
    });
    service = TestBed.inject(ThemeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should default to light theme', () => {
    expect(service.theme()).toBe(Themes.LIGHT);
  });

  it('should set theme', () => {
    service.setTheme(Themes.DARK);
    expect(service.theme()).toBe(Themes.DARK);
  });

  it('should not set same theme', () => {
    service.setTheme(Themes.LIGHT);
    expect(service.theme()).toBe(Themes.LIGHT);
  });

  it('should expose readonly selectedTheme', () => {
    expect(service.selectedTheme()).toBe(Themes.LIGHT);
  });

  it('should update DOM meta tags and attributes on theme change', () => {
    service.setTheme(Themes.DARK);
    TestBed.flushEffects();

    const themeColor = document.querySelector('meta[name="theme-color"]');
    const statusBarStyle = document.querySelector(
      'meta[name="apple-mobile-web-app-status-bar-style"]',
    );
    const colorScheme = document.querySelector('meta[name="color-scheme"]');

    expect(themeColor?.getAttribute('content')).toBe('#0b1220');
    expect(statusBarStyle?.getAttribute('content')).toBe('black');
    expect(colorScheme?.getAttribute('content')).toBe('dark');
    expect(document.documentElement.getAttribute('tuiTheme')).toBe('dark');

    service.setTheme(Themes.LIGHT);
    TestBed.flushEffects();

    expect(themeColor?.getAttribute('content')).toBe('#0b1220');
    expect(statusBarStyle?.getAttribute('content')).toBe('black');
    expect(colorScheme?.getAttribute('content')).toBe('dark');
    expect(document.documentElement.getAttribute('tuiTheme')).toBe('light');
  });

  it('should correctly evaluate isDark for dark and light themes', () => {
    service.setTheme(Themes.DARK);
    expect(service.isDark()).toBe(true);

    service.setTheme(Themes.LIGHT);
    expect(service.isDark()).toBe(false);
  });
});
