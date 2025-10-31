import { ERROR_CODES } from "../constants/errors";

export function isErrorCode(code: any): code is ERROR_CODES {
  return Object.values(ERROR_CODES).includes(code);
}