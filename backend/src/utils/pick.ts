/**
 * Returns a NEW object containing only the listed keys that are present in `source`.
 * Used to whitelist request-body fields so callers cannot set fields they shouldn't
 * (e.g. workspaceId, status). Non-object input yields an empty object.
 */
export const pick = <T extends string>(source: unknown, allowedKeys: readonly T[]): Partial<Record<T, any>> => {
  const result: Partial<Record<T, any>> = {};
  if (typeof source !== "object" || source === null || Array.isArray(source)) return result;

  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const value = (source as Record<string, unknown>)[key];
      if (value !== undefined) result[key] = value;
    }
  }
  return result;
};
