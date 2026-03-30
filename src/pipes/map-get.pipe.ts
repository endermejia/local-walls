import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'mapGet',
  standalone: true,
  pure: true,
})
export class MapGetPipe implements PipeTransform {
  transform<K, V>(key: K, map: Map<K, V> | undefined | null): V | undefined {
    if (!map) return undefined;
    return map.get(key);
  }
}
