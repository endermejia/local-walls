import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { describe, it, expect, beforeEach } from 'vitest';

import { ORDERED_GRADE_VALUES } from '../models';

import { IS_BROWSER } from '../app/is-browser';
import { MockLocalStorage } from '../testing';
import { FilterStateService } from './filter-state.service';
import { LocalStorage } from './local-storage';

describe('FilterStateService', () => {
  let service: FilterStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FilterStateService,
        { provide: LocalStorage, useClass: MockLocalStorage },
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
      ],
    });
    service = TestBed.inject(FilterStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have default area list grade range', () => {
    expect(service.areaListGradeRange()).toEqual([
      0,
      ORDERED_GRADE_VALUES.length - 1,
    ]);
  });

  it('should have default feed grade range', () => {
    expect(service.feedGradeRange()).toEqual([
      0,
      ORDERED_GRADE_VALUES.length - 1,
    ]);
  });

  it('should have default empty categories', () => {
    expect(service.areaListCategories()).toEqual([]);
    expect(service.feedCategories()).toEqual([]);
  });

  it('should have default indoor/outdoor', () => {
    expect(service.areaListShowIndoor()).toBe(false);
    expect(service.areaListShowOutdoor()).toBe(false);
  });

  it('should have default feed indoor/outdoor', () => {
    expect(service.feedShowIndoor()).toBe(false);
    expect(service.feedShowOutdoor()).toBe(false);
  });

  it('should have default profile ascents filters', () => {
    expect(service.profileAscentsGradeRange()).toEqual([
      0,
      ORDERED_GRADE_VALUES.length - 1,
    ]);
    expect(service.profileAscentsCategories()).toEqual([]);
    expect(service.profileAscentsShowIndoor()).toBe(false);
    expect(service.profileAscentsShowOutdoor()).toBe(false);
  });

  it('should set grade range', () => {
    service.areaListGradeRange.set([10, 25]);
    expect(service.areaListGradeRange()).toEqual([10, 25]);
  });

  it('should set categories', () => {
    service.areaListCategories.set([0, 1]);
    expect(service.areaListCategories()).toEqual([0, 1]);
  });

  it('should set independent indoor/outdoor filters for feed and profile', () => {
    service.feedShowIndoor.set(false);
    service.feedShowOutdoor.set(true);

    service.profileAscentsShowIndoor.set(true);
    service.profileAscentsShowOutdoor.set(false);

    expect(service.feedShowIndoor()).toBe(false);
    expect(service.feedShowOutdoor()).toBe(true);
    expect(service.profileAscentsShowIndoor()).toBe(true);
    expect(service.profileAscentsShowOutdoor()).toBe(false);
  });

  it('should reset profile filters when entering another user profile and restore when returning to own profile', () => {
    // 1. Set own profile filters
    service.setProfileContext(true);
    service.profileAscentsGradeRange.set([5, 20]);
    service.profileAscentsCategories.set([1]);
    service.profileAscentsShowIndoor.set(true);

    // 2. Switch to another user's profile
    service.setProfileContext(false);
    expect(service.isOwnProfile()).toBe(false);
    expect(service.profileAscentsGradeRange()).toEqual([
      0,
      ORDERED_GRADE_VALUES.length - 1,
    ]);
    expect(service.profileAscentsCategories()).toEqual([]);
    expect(service.profileAscentsShowIndoor()).toBe(false);
    expect(service.profileAscentsShowOutdoor()).toBe(false);

    // 3. Switch back to own profile -> restores saved filters
    service.setProfileContext(true);
    expect(service.isOwnProfile()).toBe(true);
    expect(service.profileAscentsGradeRange()).toEqual([5, 20]);
    expect(service.profileAscentsCategories()).toEqual([1]);
    expect(service.profileAscentsShowIndoor()).toBe(true);
  });
});
