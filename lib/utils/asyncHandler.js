import { serverError } from './apiResponse';

export function asyncHandler(fn) {
  return async (request, context) => {
    try {
      return await fn(request, context);
    } catch (e) {
      return serverError(e);
    }
  };
}
