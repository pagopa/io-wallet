import { TrialSystemApiClientConfig } from "@/app/config";
import { UserTrialSubscriptionRepository } from "@/user";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as TE from "fp-ts/lib/TaskEither";

import { TrialSystemHealthCheck } from "./health-check";

export class TrialSystemClient
  implements UserTrialSubscriptionRepository, TrialSystemHealthCheck
{
  #apiKey: string;
  #baseURL: string;
  #options: RequestInit;
  #requestTimeout: number;
  #trialId: string;
  featureFlag: string;

  getUserSubscriptionDetail = (fiscalCode: FiscalCode) =>
    TE.tryCatch(
      async () => {
        const result = await fetch(
          new URL(
            `/manage/api/v1/trials/${this.#trialId}/subscriptions/${fiscalCode}`,
            this.#baseURL,
          ),
          {
            ...this.#options,
            signal: AbortSignal.timeout(this.#requestTimeout),
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
        const result = await fetch(
          new URL(`/manage/api/v1/trials/${this.#trialId}`, this.#baseURL),
          {
            ...this.#options,
            signal: AbortSignal.timeout(this.#requestTimeout),
          },
        );
        return result.status === 200;
      },
      (error) => new Error(`error checking trial system health: ${error}`),
    );

  constructor({
    apiKey,
    baseURL,
    featureFlag,
    requestTimeout,
    trialId,
  }: TrialSystemApiClientConfig) {
    this.#apiKey = apiKey;
    this.#baseURL = baseURL;
    this.#trialId = trialId;
    this.featureFlag = featureFlag;
    this.#options = {
      headers: {
        "Ocp-Apim-Subscription-Key": this.#apiKey,
      },
      method: "GET",
    };
    this.#requestTimeout = requestTimeout;
  }
}
