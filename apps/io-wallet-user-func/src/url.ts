export const removeTrailingSlash = (value: string): string => {
  if (value && value[value.length - 1] === "/") {
    return value.substring(0, value.length - 1);
  }
  return value;
};

const ensureTrailingSlash = (value: string) =>
  value.endsWith("/") ? value : `${value}/`;

export const buildUrl = (path: string, baseUrl: string) =>
  new URL(path, ensureTrailingSlash(baseUrl)).href;
