import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

export interface NewPhoto {
  id: string;
  file: File;
  preview: string;
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function reorderGallery(
  event: CdkDragDrop<unknown[]>,
  imageUrls: string[],
  newPhotos: NewPhoto[],
): { imageUrls: string[]; newPhotos: NewPhoto[] } {
  interface ExistingItem {
    type: 'existing';
    url: string;
  }
  interface NewItem {
    type: 'new';
    photo: NewPhoto;
  }
  type Item = ExistingItem | NewItem;

  const combined: Item[] = [
    ...imageUrls.map((url): ExistingItem => ({ type: 'existing', url })),
    ...newPhotos.map((p): NewItem => ({ type: 'new', photo: p })),
  ];

  moveItemInArray(combined, event.previousIndex, event.currentIndex);

  return {
    imageUrls: combined
      .filter((i): i is ExistingItem => i.type === 'existing')
      .map((i) => i.url),
    newPhotos: combined
      .filter((i): i is NewItem => i.type === 'new')
      .map((i) => i.photo),
  };
}
export const COMMON_IMAGE_EDITOR_CONFIG = {
  aspectRatios: [
    { titleKey: '1:1', descriptionKey: '1:1', ratio: 1 },
    { titleKey: '4:3', descriptionKey: '4:3', ratio: 4 / 3 },
    { titleKey: '16:9', descriptionKey: '16:9', ratio: 16 / 9 },
  ],
  allowFree: true,
  resizeToWidth: 1000,
  imageQuality: 75,
};

export function createNewPhoto(file: File, preview: string): NewPhoto {
  return {
    id: crypto.randomUUID(),
    file,
    preview,
  };
}
