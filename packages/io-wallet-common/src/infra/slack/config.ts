import { pipe } from "fp-ts/lib/function";
import * as RE from "fp-ts/lib/ReaderEither";
import * as t from "io-ts";

import { readFromEnvironment } from "../env";

export const SlackConfig = t.type({
  statusChannelWebhook: t.string,
});

export type SlackConfig = t.TypeOf<typeof SlackConfig>;

export const getSlackConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  SlackConfig
> = pipe(
  readFromEnvironment("SlackStatusChannelWebhook"),
  RE.map((statusChannelWebhook) => ({ statusChannelWebhook })),
);
