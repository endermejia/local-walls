import { Pipe, PipeTransform } from '@angular/core';
import { GRADE_NUMBER_TO_LABEL, VERTICAL_LIFE_GRADES } from '../models';

@Pipe({
  name: 'gradeLabel',
  standalone: true,
})
export class GradeLabelPipe implements PipeTransform {
  transform(grade: number | null | undefined): string {
    if (grade === null || grade === undefined) return '';
    return (
      GRADE_NUMBER_TO_LABEL[grade as VERTICAL_LIFE_GRADES] ||
      grade.toString() ||
      ''
    );
  }
}
