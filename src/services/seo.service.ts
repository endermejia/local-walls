import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';

export interface SeoPageData {
  title: string;
  description?: string;
  /** Full canonical URL (optional – derived from window.location if omitted in browser) */
  canonicalUrl?: string;
  /** OG image absolute URL (optional) */
  imageUrl?: string;
  type?: 'website' | 'article';
}

const APP_NAME = 'ClimBeast';
const BASE_URL = 'https://climbeast.com';
const DEFAULT_IMAGE = `${BASE_URL}/logo/climbeast-black.jpg`;

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  /**
   * Update all SEO-related tags for the current page.
   * Call this from page components whenever the key data is available.
   */
  setPage(data: SeoPageData): void {
    const fullTitle = data.title.includes(APP_NAME)
      ? data.title
      : `${data.title} | ${APP_NAME}`;
    const description = data.description ?? '';
    const canonicalUrl = data.canonicalUrl ?? this.getCurrentUrl();
    const imageUrl = data.imageUrl ?? DEFAULT_IMAGE;
    const type = data.type ?? 'website';

    // --- <title> ---
    this.title.setTitle(fullTitle);

    // --- Basic meta ---
    this.updateTag('description', description);

    // --- Open Graph ---
    this.updateOgTag('og:title', fullTitle);
    this.updateOgTag('og:description', description);
    this.updateOgTag('og:url', canonicalUrl);
    this.updateOgTag('og:image', imageUrl);
    this.updateOgTag('og:type', type);
    this.updateOgTag('og:site_name', APP_NAME);

    // --- Twitter Card ---
    this.updateTag('twitter:card', 'summary_large_image');
    this.updateTag('twitter:title', fullTitle);
    this.updateTag('twitter:description', description);
    this.updateTag('twitter:image', imageUrl);

    // --- Canonical link ---
    this.setCanonical(canonicalUrl);
  }

  /**
   * Reset to app-wide default SEO (from translation keys already handled by AppComponent).
   * Just resets canonical to current URL.
   */
  resetToDefault(): void {
    this.setCanonical(this.getCurrentUrl());
  }

  private getCurrentUrl(): string {
    if (isPlatformBrowser(this.platformId)) {
      return this.doc.location.href.split('?')[0].split('#')[0];
    }
    return BASE_URL;
  }

  private updateTag(name: string, content: string): void {
    this.meta.updateTag({ name, content });
  }

  private updateOgTag(property: string, content: string): void {
    this.meta.updateTag({ property, content });
  }

  private setCanonical(url: string): void {
    if (!this.doc) return;
    let link: HTMLLinkElement | null = this.doc.querySelector(
      'link[rel="canonical"]',
    );
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}
