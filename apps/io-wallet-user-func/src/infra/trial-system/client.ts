import { TrialSystemApiClientConfig } from "@/app/config";
import { UserTrialSubscriptionRepository } from "@/user";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as TE from "fp-ts/lib/TaskEither";

import { TrialSystemHealthCheck } from "./health-check";

export class TrialSystemClient
  implements UserTrialSubscriptionRepository, TrialSystemHealthCheck
{
  #apiKey: string;
  #baseURL: string;
  #trialId: string;
  featureFlag: string;

  getUserSubscriptionDetail = (userId: NonEmptyString) =>
    TE.tryCatch(
      async () => {
        const result = await fetch(
          new URL(
            `/trials/${this.#trialId}/subscriptions/${userId}`,
            this.#baseURL,
          ),
          {
            headers: {
              "x-functions-key": this.#apiKey,
            },
            method: "GET",
            signal: AbortSignal.timeout(3000),
          },
        );
        if (!result.ok) {
          throw new Error(JSON.stringify(await result.json()));
        }
        return result.json();
      },
      (error) =>
        new Error(
          `error getting trial system user subscription detail: ${error}`,
        ),
    );

  healthCheck = () =>
    TE.tryCatch(
      async () => {
        const result = await fetch(new URL("/info", this.#baseURL), {
          method: "GET",
          signal: AbortSignal.timeout(3000),
        });
        return result.status === 200;
      },
      (error) => new Error(`error checking trial system health: ${error}`),
    );

  constructor({
    apiKey,
    baseURL,
    featureFlag,
    trialId,
  }: TrialSystemApiClientConfig) {
    this.#apiKey = apiKey;
    this.#baseURL = baseURL;
    this.#trialId = trialId;
    this.featureFlag = featureFlag;
  }
}
