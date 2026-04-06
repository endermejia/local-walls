import { GradeLabelPipe } from './grade-label.pipe';
import { GRADE_NUMBER_TO_LABEL, VERTICAL_LIFE_GRADES, PROJECT_GRADE_LABEL } from '../models';

describe('GradeLabelPipe', () => {
  let pipe: GradeLabelPipe;

  beforeEach(() => {
    pipe = new GradeLabelPipe();
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return empty string for null', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });

  it('should return correct label for a valid grade from mapping', () => {
    expect(pipe.transform(VERTICAL_LIFE_GRADES.G6a)).toBe('6a');
  });

  it('should return correct label for project grade', () => {
    expect(pipe.transform(VERTICAL_LIFE_GRADES.G0)).toBe(PROJECT_GRADE_LABEL);
  });

  it('should return stringified number if grade is not in mapping', () => {
    expect(pipe.transform(999)).toBe('999');
  });
});
