import { AmountByEveryGrade } from './grade.model';

export interface TopoListItem {
  id: number;
  name: string;
  slug: string;
  photo?: string | null;
  grades: AmountByEveryGrade;
  shade_afternoon: boolean;
  shade_change_hour: string | null;
  shade_morning: boolean;
}
