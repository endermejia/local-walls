import { waitForResource, getAvatarPath, getAreaImagePath } from './resource-helpers';
import { ResourceRef } from '@angular/core';

describe('Resource Helpers', () => {
  describe('waitForResource', () => {
    it('should return the value immediately if it is already defined', async () => {
      const mockResource = {
        value: () => 'test-value'
      } as ResourceRef<string>;

      const result = await waitForResource(mockResource);
      expect(result).toBe('test-value');
    });

    it('should return the value after several polling attempts if it becomes defined later', async () => {
      let attempts = 0;
      const mockResource = {
        value: () => {
          attempts++;
          if (attempts >= 3) {
            return 'delayed-value';
          }
          return undefined;
        }
      } as ResourceRef<string>;

      const startTime = Date.now();
      const result = await waitForResource(mockResource, 10, 10);
      const duration = Date.now() - startTime;

      expect(result).toBe('delayed-value');
      expect(attempts).toBe(3);
      // Should wait approx 20ms (2 intervals of 10ms), use a slightly lower bound to avoid flakiness
      expect(duration).toBeGreaterThanOrEqual(10);
    });

    it('should return undefined if the value remains undefined after max attempts', async () => {
      let attempts = 0;
      const mockResource = {
        value: () => {
          attempts++;
          return undefined;
        }
      } as ResourceRef<string>;

      const result = await waitForResource(mockResource, 5, 10);

      expect(result).toBeUndefined();
      expect(attempts).toBe(5);
    });
  });

  describe('getAvatarPath', () => {
    it('should format the avatar path correctly', () => {
      expect(getAvatarPath('user123')).toBe('avatars/user123');
    });
  });

  describe('getAreaImagePath', () => {
    it('should format the area image path correctly', () => {
      expect(getAreaImagePath('area456')).toBe('areas/area456/cover');
    });
  });
});
