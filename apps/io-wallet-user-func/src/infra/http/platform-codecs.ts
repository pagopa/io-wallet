import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";

export const Platform = t.union([t.literal("ios"), t.literal("android")]);

export type Platform = t.TypeOf<typeof Platform>;

export const PlatformFromRequest = new t.Type<Platform, string, unknown>(
  "PlatformFromRequest",
  Platform.is,
  (input, context) =>
    pipe(
      t.string.validate(input, context),
      E.chain((platform) => Platform.decode(platform.toLowerCase())),
    ),
  (platform) => platform,
);
