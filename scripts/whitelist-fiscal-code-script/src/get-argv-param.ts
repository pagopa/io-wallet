export const getArgvParam = (name: string): string | undefined => {
  const arg = process.argv.find((e) => e.startsWith(`${name}=`));
  return arg ? arg.replace(`${name}=`, "").trim() : undefined;
};
