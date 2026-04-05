import { ToastService } from '../services/toast.service';
import { extractErrorMessage, handleErrorToast } from './handle-error';

describe('Handle Error Utils', () => {
  describe('handleErrorToast', () => {
    let toastServiceMock: jasmine.SpyObj<ToastService>;

    beforeEach(() => {
      toastServiceMock = jasmine.createSpyObj('ToastService', ['error']);
    });

    it('should show foreign key violation message for code 23503', () => {
      handleErrorToast({ code: '23503' }, toastServiceMock);
      expect(toastServiceMock.error).toHaveBeenCalledWith(
        'errors.database.foreign_key_violation',
      );
    });

    it('should show unique violation message for code 23505', () => {
      handleErrorToast({ code: '23505' }, toastServiceMock);
      expect(toastServiceMock.error).toHaveBeenCalledWith(
        'errors.database.unique_violation',
      );
    });

    it('should show unexpected error message for unknown code', () => {
      handleErrorToast({ code: '99999' }, toastServiceMock);
      expect(toastServiceMock.error).toHaveBeenCalledWith('errors.unexpected');
    });

    it('should show unexpected error message for null error', () => {
      handleErrorToast(null as any, toastServiceMock);
      expect(toastServiceMock.error).toHaveBeenCalledWith('errors.unexpected');
    });

    it('should show unexpected error message for undefined error', () => {
      handleErrorToast(undefined as any, toastServiceMock);
      expect(toastServiceMock.error).toHaveBeenCalledWith('errors.unexpected');
    });
  });

  describe('extractErrorMessage', () => {
    it('should return error message for Error instance', () => {
      const error = new Error('Test error message');
      expect(extractErrorMessage(error)).toBe('Test error message');
    });

    it('should return the string itself if error is a string', () => {
      const error = 'String error message';
      expect(extractErrorMessage(error)).toBe('String error message');
    });

    it('should return JSON string for plain objects', () => {
      const error = { foo: 'bar', baz: 123 };
      expect(extractErrorMessage(error)).toBe(JSON.stringify(error));
    });

    it('should return "Unknown error" for objects that cannot be stringified', () => {
      const circular: any = {};
      circular.self = circular;
      expect(extractErrorMessage(circular)).toBe('Unknown error');
    });

    it('should return "null" for null', () => {
      expect(extractErrorMessage(null)).toBe('null');
    });

    it('should return "undefined" for undefined', () => {
      expect(extractErrorMessage(undefined)).toBe('undefined');
    });
  });
});
