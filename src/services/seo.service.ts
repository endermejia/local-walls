import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { APP_NAME, APP_TITLE, BASE_URL, DEFAULT_IMAGE } from '../models';

export interface SeoPageData {
  title: string;
  description?: string;
  /** Full canonical URL (optional – derived from window.location if omitted in browser) */
  canonicalUrl?: string;
  /** OG image absolute URL (optional) */
  imageUrl?: string;
  type?: 'website' | 'article';
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  /**
   * Update all SEO-related tags for the current page.
   * Tab title remains static while social tags are branded with the page title.
   */
  setPage(data: SeoPageData): void {
    const {
      title,
      description = '',
      canonicalUrl = this.getCurrentUrl(),
      imageUrl = DEFAULT_IMAGE,
      type = 'website',
    } = data;

    const brandedTitle = title.includes(APP_NAME)
      ? title
      : `${title} | ${APP_NAME}`;

    // --- Tab Title (Static) ---
    this.title.setTitle(APP_TITLE);

    // --- Basic & Twitter ---
    this.updateTag('description', description);
    this.updateTag('twitter:card', 'summary_large_image');
    this.updateTag('twitter:title', brandedTitle);
    this.updateTag('twitter:description', description);
    this.updateTag('twitter:image', imageUrl);

    // --- Open Graph ---
    this.updateOgTag('og:title', brandedTitle);
    this.updateOgTag('og:description', description);
    this.updateOgTag('og:url', canonicalUrl);
    this.updateOgTag('og:image', imageUrl);
    this.updateOgTag('og:type', type);
    this.updateOgTag('og:site_name', APP_NAME);

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
