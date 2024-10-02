import { validateAttestation } from "@/attestation-service";
import { isTestUser, validateTestAttestation } from "@/load-test";
import {
  insertWalletInstance,
  revokeUserValidWalletInstancesExceptOne,
} from "@/wallet-instance";
import { consumeNonce } from "@/wallet-instance-request";
import * as H from "@pagopa/handler-kit";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { sequenceS } from "fp-ts/Apply";
import { pipe } from "fp-ts/function";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as t from "io-ts";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";

import { requireUserFromHeader } from "../user-id-header-validator";

const WalletInstanceRequestPayload = t.type({
  challenge: NonEmptyString,
  hardware_key_tag: NonEmptyString,
  key_attestation: NonEmptyString,
});

type WalletInstanceRequestPayload = t.TypeOf<
  typeof WalletInstanceRequestPayload
>;

const requireWalletInstanceRequest = (req: H.HttpRequest) =>
  pipe(
    req.body,
    H.parse(WalletInstanceRequestPayload),
    E.chain(({ challenge, hardware_key_tag, key_attestation }) =>
      sequenceS(E.Apply)({
        challenge: E.right(challenge),
        hardwareKeyTag: E.right(hardware_key_tag),
        keyAttestation: E.right(key_attestation),
      }),
    ),
  );

export const CreateWalletInstanceHandler = H.of((req: H.HttpRequest) =>
  pipe(
    sequenceS(RTE.ApplyPar)({
      user: pipe(req, requireUserFromHeader, RTE.fromEither),
      walletInstanceRequest: pipe(
        req,
        requireWalletInstanceRequest,
        RTE.fromEither,
      ),
    }),
    RTE.chainW(({ user, walletInstanceRequest }) =>
      pipe(
        consumeNonce(walletInstanceRequest.challenge),
        RTE.chainW(() => isTestUser(user)),
        RTE.chainW((isTest) =>
          isTest
            ? validateTestAttestation(walletInstanceRequest, user)
            : validateAttestation(walletInstanceRequest),
        ),
        RTE.bind("walletInstance", ({ deviceDetails, hardwareKey }) =>
          RTE.right({
            createdAt: new Date(),
            deviceDetails,
            hardwareKey,
            id: walletInstanceRequest.hardwareKeyTag,
            isRevoked: false as const,
            signCount: 0,
            userId: user.id,
          }),
        ),
        RTE.chainW(({ walletInstance }) =>
          pipe(
            insertWalletInstance(walletInstance),
            RTE.chainW(() =>
              revokeUserValidWalletInstancesExceptOne(
                user.id,
                walletInstanceRequest.hardwareKeyTag,
              ),
            ),
          ),
        ),
      ),
    ),
    RTE.map(() => H.empty),
    RTE.orElseW(logErrorAndReturnResponse),
  ),
);
