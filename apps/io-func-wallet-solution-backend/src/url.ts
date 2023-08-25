export const removeTrailingSlash = (value: string): string => {
  if (value && value[value.length - 1] === "/") {
    return value.substring(0, value.length - 1);
  }
  return value;
};
