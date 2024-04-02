import { X509Certificate } from "crypto";
import * as E from "fp-ts/Either";
import * as S from "fp-ts/lib/string";
import { flow, pipe } from "fp-ts/function";
import * as RA from "fp-ts/lib/ReadonlyArray";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";

const base64ToPem = (b64cert: string) =>
  `-----BEGIN CERTIFICATE-----\n${b64cert}-----END CERTIFICATE-----`;

// TODO: [SIW-944] Add Android integrity check
export const validateAndroidAttestation = (
  data: Buffer,
  _nonce: NonEmptyString
) =>
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
    E.map(() => true)
  );
