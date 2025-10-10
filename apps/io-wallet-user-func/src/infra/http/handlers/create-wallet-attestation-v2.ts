import * as H from "@pagopa/handler-kit";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as appInsights from "applicationinsights";
import { X509Certificate } from "crypto";
import { flow, pipe } from "fp-ts/function";
import { sequenceS } from "fp-ts/lib/Apply";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as TE from "fp-ts/lib/TaskEither";
import * as t from "io-ts";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";
import { NotificationService } from "io-wallet-common/notification";
import {
  WalletInstanceValid,
  WalletInstanceValidWithAndroidCertificatesChain,
} from "io-wallet-common/wallet-instance";

import { AttestationServiceConfiguration } from "@/app/config";
import { AttestationService, validateAssertionV2 } from "@/attestation-service";
import { validateRevocation } from "@/certificates";
import { IntegrityCheckError } from "@/infra/mobile-attestation-service";
import { NonceEnvironment } from "@/nonce";
import { sendExceptionWithBodyToAppInsights } from "@/telemetry";
import { isLoadTestUser } from "@/user";
import {
  createWalletAttestationAsJwt,
  createWalletAttestationAsSdJwt,
  getWalletAttestationData,
} from "@/wallet-attestation";
import { createWalletAttestationAsMdoc } from "@/wallet-attestation-mdoc";
import {
  verifyAndDecodeWalletAttestationRequest,
  WalletAttestationRequestV2,
} from "@/wallet-attestation-request";
import {
  getValidWalletInstanceByUserId,
  WalletInstanceEnvironment,
} from "@/wallet-instance";
import { consumeNonce } from "@/wallet-instance-request";

export const WalletAttestations = t.type({
  wallet_attestations: t.tuple([
    t.type({
      format: t.literal("jwt"),
      wallet_attestation: t.string,
    }),
    t.type({
      format: t.literal("dc+sd-jwt"),
      wallet_attestation: t.string,
    }),
    t.type({
      format: t.literal("mso_mdoc"),
      wallet_attestation: t.string,
    }),
  ]),
});

type WalletAttestations = t.TypeOf<typeof WalletAttestations>;

const testWalletAttestations: WalletAttestations = {
  wallet_attestations: [
    {
      format: "jwt",
      wallet_attestation: "this_is_a_test_jwt_attestation",
    },
    {
      format: "dc+sd-jwt",
      wallet_attestation: "this_is_a_test_sd_jwt_attestation",
    },
    {
      format: "mso_mdoc",
      wallet_attestation: "this_is_a_test_mdoc_attestation",
    },
  ],
};

const decodeAndroidChain = (
  walletInstance: WalletInstanceValid,
): E.Either<Error, readonly string[]> =>
  pipe(
    WalletInstanceValidWithAndroidCertificatesChain.decode(walletInstance),
    E.mapLeft(
      () =>
        new Error(
          "Invalid wallet instance: missing Android certificates chain",
        ),
    ),
    E.map((wi) => wi.deviceDetails.x509Chain),
  );

const parseCertificates = (
  chain: readonly string[],
): E.Either<Error, { x509Chain: readonly X509Certificate[] }> =>
  pipe(
    chain,
    RA.traverse(E.Applicative)((cert) =>
      E.tryCatch(() => new X509Certificate(cert), E.toError),
    ),
    E.map((x509Chain) => ({ x509Chain })),
  );

const checkCertificateRevocation = ({
  googleCrl,
  x509Chain,
}: {
  googleCrl: {
    entries: Record<
      string,
      {
        reason?: string | undefined;
        status?: string | undefined;
      }
    >;
  };
  x509Chain: readonly X509Certificate[];
}) =>
  pipe(
    TE.tryCatch(() => validateRevocation(x509Chain, googleCrl), E.toError),
    TE.chain(
      (validationResult) =>
        validationResult.success
          ? TE.right(undefined)
          : TE.left(new IntegrityCheckError([])),
      // If revocation validation fails, the Wallet Instance is revoked, telemetry is sent to App Insights, a Slack alert is triggered, and an IntegrityCheckError is thrown.
    ),
  );

declare const getCrl: RTE.ReaderTaskEither<
  { attestationServiceConfiguration: AttestationServiceConfiguration },
  Error,
  {
    entries: Record<
      string,
      {
        reason?: string | undefined; // ?
        status?: string | undefined;
      }
    >;
  }
>;

const foo: (walletInstance: WalletInstanceValid) => RTE.ReaderTaskEither<
  {
    attestationServiceConfiguration: AttestationServiceConfiguration;
    notificationService: NotificationService;
    telemetryClient: appInsights.TelemetryClient;
  },
  IntegrityCheckError, // only IntegrityCheckError is relevant; other failures are ignored
  void
> = flow(
  decodeAndroidChain,
  E.chain(parseCertificates),
  RTE.fromEither,
  RTE.bind("googleCrl", () => getCrl),
  RTE.chainW(flow(checkCertificateRevocation, RTE.fromTaskEither)),
);

/**
 * Validates the wallet attestation request by performing the following steps:
 * 1. Consumes the nonce from the request
 * 2. Retrieves the wallet instance associated with the attestation request and verifies it hasn't been revoked
 * 3. For non-test users, validates the assertion in the request
 * 4.
 */
const validateRequest: (input: {
  assertion: WalletAttestationRequestV2;
  isTestUser: boolean;
  userId: FiscalCode;
}) => RTE.ReaderTaskEither<
  NonceEnvironment &
    WalletInstanceEnvironment & {
      attestationService: AttestationService;
    } & {
      attestationServiceConfiguration: AttestationServiceConfiguration;
      notificationService: NotificationService;
      telemetryClient: appInsights.TelemetryClient;
    },
  Error,
  void
> = ({ assertion, isTestUser, userId }) =>
  pipe(
    assertion.payload.nonce,
    consumeNonce,
    RTE.chainW(() =>
      getValidWalletInstanceByUserId(
        assertion.payload.hardware_key_tag,
        userId,
      ),
    ),
    RTE.chainFirstW((walletInstance) =>
      isTestUser
        ? RTE.right(undefined)
        : validateAssertionV2(
            assertion,
            walletInstance.hardwareKey,
            walletInstance.signCount,
            userId,
          ),
    ),
    RTE.chainW(foo),
  );

const sendExceptionToAppInsights = (error: Error, requestBody: unknown) =>
  sendExceptionWithBodyToAppInsights(
    error,
    requestBody,
    "createWalletAttestationV2",
  );

const generateWalletAttestations = ({
  assertion,
  isTestUser,
}: {
  assertion: WalletAttestationRequestV2;
  isTestUser: boolean;
}) =>
  pipe(
    assertion,
    getWalletAttestationData,
    RTE.chainW((walletAttestationData) =>
      pipe(
        sequenceS(RTE.ApplyPar)({
          jwt: createWalletAttestationAsJwt(walletAttestationData),
          msoMdoc: createWalletAttestationAsMdoc(walletAttestationData),
          sdJwt: createWalletAttestationAsSdJwt(walletAttestationData),
        }),
        RTE.map(({ jwt, msoMdoc, sdJwt }) =>
          isTestUser
            ? testWalletAttestations
            : {
                wallet_attestations: [
                  {
                    format: "jwt",
                    wallet_attestation: jwt,
                  },
                  {
                    format: "dc+sd-jwt",
                    wallet_attestation: sdJwt,
                  },
                  {
                    format: "mso_mdoc",
                    wallet_attestation: msoMdoc,
                  },
                ],
              },
        ),
      ),
    ),
  );

const WalletAttestationRequestPayload = t.type({
  assertion: NonEmptyString,
  fiscal_code: FiscalCode,
});

type WalletAttestationRequestPayload = t.TypeOf<
  typeof WalletAttestationRequestPayload
>;

const requireWalletAttestationRequest = flow(
  H.parse(WalletAttestationRequestPayload),
  E.chain(({ assertion, fiscal_code }) =>
    sequenceS(E.Apply)({
      assertion: E.right(assertion),
      fiscalCode: E.right(fiscal_code),
    }),
  ),
);

const verifyAssertion = ({
  assertion,
  fiscalCode,
}: {
  assertion: string;
  fiscalCode: FiscalCode;
}) =>
  pipe(
    assertion,
    verifyAndDecodeWalletAttestationRequest,
    TE.map((validatedAssertion) => ({
      assertion: validatedAssertion,
      userId: fiscalCode,
    })),
  );

const addIsTestUser = ({
  assertion,
  userId,
}: {
  assertion: WalletAttestationRequestV2;
  userId: FiscalCode;
}) => ({
  assertion,
  isTestUser: isLoadTestUser(userId),
  userId,
});

export const CreateWalletAttestationV2Handler = H.of((req: H.HttpRequest) =>
  pipe(
    req.body,
    requireWalletAttestationRequest,
    TE.fromEither,
    TE.chain(verifyAssertion),
    TE.map(addIsTestUser),
    RTE.fromTaskEither,
    RTE.chainFirst(validateRequest),
    RTE.chainW(generateWalletAttestations),
    RTE.map(H.successJson),
    RTE.orElseFirstW((error) => sendExceptionToAppInsights(error, req.body)),
    RTE.orElseW(logErrorAndReturnResponse),
  ),
);
