import { ToastService } from '../services/toast.service';
import { handleErrorToast } from './handle-error';

describe('handleErrorToast', () => {
  let mockToast: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    mockToast = jasmine.createSpyObj('ToastService', ['error']);
  });

  it('should show unexpected error toast by default', () => {
    handleErrorToast({}, mockToast);
    expect(mockToast.error).toHaveBeenCalledWith('errors.unexpected');
  });

  it('should show unexpected error toast when error is null', () => {
    handleErrorToast(null as any, mockToast);
    expect(mockToast.error).toHaveBeenCalledWith('errors.unexpected');
  });

  it('should show unexpected error toast when code is unknown', () => {
    handleErrorToast({ code: 'UNKNOWN' }, mockToast);
    expect(mockToast.error).toHaveBeenCalledWith('errors.unexpected');
  });

  it('should show foreign key violation error toast for code 23503', () => {
    handleErrorToast({ code: '23503' }, mockToast);
    expect(mockToast.error).toHaveBeenCalledWith('errors.database.foreign_key_violation');
  });

  it('should show unique violation error toast for code 23505', () => {
    handleErrorToast({ code: '23505' }, mockToast);
    expect(mockToast.error).toHaveBeenCalledWith('errors.database.unique_violation');
  });
});
