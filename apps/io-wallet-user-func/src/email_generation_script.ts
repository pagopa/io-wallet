import { pipe } from "fp-ts/lib/function";
import * as fs from "fs";
import * as path from "path";

import mjml2html = require("mjml");

const LOCAL_ASSET_REGEX = /\.\/templates\/assets\//g;
const REMOTE_ASSET_BASE_URL = `https://raw.githubusercontent.com/pagopa/io-app-email-templates/assets-v1.0.0/assets/`;

export const emailGenerationScript = (mjmlDirectory: string): string =>
  pipe(
    mjmlDirectory,
    (fileName) =>
      fs.readFileSync(
        path.resolve(__dirname, "./templates/" + fileName + "/index.mjml"),
        "utf8",
      ),
    (mjmlContent) =>
      mjml2html(mjmlContent, {
        filePath: "./templates/assets/",
      }).html.replace(LOCAL_ASSET_REGEX, REMOTE_ASSET_BASE_URL),
  );
