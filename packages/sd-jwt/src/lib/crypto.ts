// FIXME: create an hash function that works on nodejs, browser and react native runtimes
export function hash(alg: string, value: string, salt: string): string {
  return (
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require("crypto")
      .createHash(alg, salt)
      .update(value)
      .digest("base64")
      // remove trailing "="
      .split("=")[0]
      // replace "/" with "_"
      .replace(/\//g, "_")
      // replace "+" with "-"
      .replace(/\+/g, "-")
  );
}
