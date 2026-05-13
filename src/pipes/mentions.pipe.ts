import { Pipe, PipeTransform } from '@angular/core';

import { parseMentions, MentionSegment } from '../utils/mentions.utils';

@Pipe({
  name: 'mentions',
  standalone: true,
})
export class MentionsPipe implements PipeTransform {
  transform(value: string | null | undefined): MentionSegment[] {
    return parseMentions(value);
  }
}
