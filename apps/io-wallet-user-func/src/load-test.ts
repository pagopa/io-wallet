import * as E from "fp-ts/Either";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import { User } from "io-wallet-common/user";

import { ValidatedAttestation } from "./attestation-service";
import { WalletInstanceRequest } from "./wallet-instance-request";

export interface LoadTestClient {
  isTestUser: (user: User) => E.Either<Error, boolean>;
}

export const isTestUser: (user: User) => RTE.ReaderTaskEither<
  {
    loadTestClient: LoadTestClient;
  },
  Error,
  boolean
> =
  (user) =>
  ({ loadTestClient }) =>
    pipe(user, loadTestClient.isTestUser, TE.fromEither);

export const validateTestAttestation: (
  walletInstanceRequest: WalletInstanceRequest,
  user: User,
) => RTE.ReaderTaskEither<object, Error, ValidatedAttestation> = (
  walletInstanceRequest,
  user,
) =>
  RTE.right({
    createdAt: new Date(),
    deviceDetails: {
      platform: "ios",
    },
    hardwareKey: {
      crv: "P-256",
      kid: "Test Hardware Key",
      kty: "EC",
      x: "z3PTdkV20dwTADp2Xur5AXqLbQz7stUbvRNghMQu1rY",
      y: "Z7MC2EHmlPuoYDRVfy-upr_06-lBYobEk_TCwuSb2ho",
    },
    id: walletInstanceRequest.hardwareKeyTag,
    isRevoked: false as const,
    signCount: 0,
    userId: user.id,
  });

export const validateTestAssertion: () => RTE.ReaderTaskEither<
  object,
  Error,
  void
> = () => RTE.right(undefined);
