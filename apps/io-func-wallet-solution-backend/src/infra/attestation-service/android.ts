import { X509Certificate } from "crypto";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import * as S from "fp-ts/lib/string";
import { flow, pipe } from "fp-ts/function";
import * as RA from "fp-ts/lib/ReadonlyArray";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { ValidatedAttestation } from "../../attestation-service";

const base64ToPem = (b64cert: string) =>
  `-----BEGIN CERTIFICATE-----\n${b64cert}-----END CERTIFICATE-----`;

// TODO: [SIW-944] Add Android integrity check
export const validateAndroidAttestation = (
  data: Buffer,
  _nonce: NonEmptyString
): TE.TaskEither<Error, ValidatedAttestation> =>
  pipe(
    data.toString("utf-8"),
    S.split(","),
    RA.map(
      flow(base64ToPem, (cert) =>
        E.tryCatch(
          () => new X509Certificate(cert),
          () => new Error(`Unable to decode X509 certificate`)
        )
      )
    ),
    RA.sequence(E.Applicative),
    TE.fromEither,
    TE.map(() => ({
      keyId: "test",
      publicKey: {},
      environment: "development",
    }))
  );
