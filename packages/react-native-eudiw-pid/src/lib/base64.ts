/**
 * The code was extracted from:
 * https://github.com/davidchambers/Base64.js
 */

const chars =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

class InvalidCharacterError extends Error {
  constructor(...args: string[]) {
    super(...args);
    this.name = "InvalidCharacterError";
  }
}

function atob(input: string) {
  const str = input.replace(/=+$/, "");
  if (str.length % 4 === 1) {
    throw new InvalidCharacterError(
      "'atob' failed: The string to be decoded is not correctly encoded."
    );
  }
  let output = ""; // eslint-disable-line functional/no-let
  for (
    // initialize result and counters
    let bc = 0, bs = -1, buffer, idx = 0; // eslint-disable-line functional/no-let
    // get next character
    (buffer = str.charAt(idx++));
    // character found in table? initialize bit storage and add its ascii value;
    ~buffer && // eslint-disable-line no-bitwise
    ((bs = bc % 4 ? bs * 64 + buffer : buffer),
    // and if not first of each 4 characters,
    // convert the first 8 bits to one ascii character
    bc++ % 4)
      ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)))) // eslint-disable-line no-bitwise
      : 0
  ) {
    // try to find character in table (0-63, not found => -1)
    buffer = chars.indexOf(buffer);
  }
  return output;
}

/**
 * The code was extracted from:
 * https://github.com/auth0/jwt-decode
 */
function b64DecodeUnicode(str: string) {
  return decodeURIComponent(
    atob(str).replace(/(.)/g, function (m, p) {
      let code: string = p.charCodeAt(0).toString(16).toUpperCase(); // eslint-disable-line functional/no-let
      if (code.length < 2) {
        code = "0" + code;
      }
      return "%" + code;
    })
  );
}

export default function (str: string) {
  let output = str.replace(/-/g, "+").replace(/_/g, "/"); // eslint-disable-line functional/no-let
  switch (output.length % 4) {
    case 0:
      break;
    case 2:
      output += "==";
      break;
    case 3:
      output += "=";
      break;
    default:
      throw new Error("base64 string is not of the correct length");
  }

  try {
    return b64DecodeUnicode(output);
  } catch (err) {
    return atob(output);
  }
}
