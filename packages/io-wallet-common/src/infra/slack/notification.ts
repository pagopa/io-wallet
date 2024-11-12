import { pipe } from "fp-ts/function";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";

import { NotificationService } from "../../notification";
import { SlackConfig } from "./config";

export class SlackNotificationService implements NotificationService {
  #configuration: SlackConfig;

  sendMessage = (message: string) =>
    pipe(
      TE.tryCatch(
        () =>
          fetch(this.#configuration.statusChannelWebhook, {
            body: JSON.stringify({ text: message }),
            headers: {
              "Content-Type": "application/json",
            },
            method: "POST",
          }),
        E.toError,
      ),
      TE.map(() => undefined),
    );
  constructor(cnf: SlackConfig) {
    this.#configuration = cnf;
  }
}
