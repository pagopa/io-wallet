import * as H from "@pagopa/handler-kit";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/Either";
import { flow } from "fp-ts/function";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as RA from "fp-ts/ReadonlyArray";
import * as t from "io-ts";

import { sendTelemetryException } from "@/infra/telemetry";
import { revokeBits, StatusListBinding } from "@/status-list";

const RevokedWalletInstanceWithStatus = t.type({
  isRevoked: t.literal(true),
  status: t.type({
    index: t.number,
    statusListId: NonEmptyString,
  }),
});

const getStatusBindingsIfRevoked = (
  documents: readonly unknown[],
): readonly StatusListBinding[] =>
  documents.reduce<StatusListBinding[]>((result, document) => {
    if (RevokedWalletInstanceWithStatus.is(document)) {
      result.push(document.status);
    }

    return result;
  }, []);

export const RevokeWalletInstancesHandler = H.of(
  flow(
    getStatusBindingsIfRevoked,
    RA.match(() => RTE.right(undefined), revokeBits),
    RTE.orElseFirstW(
      flow(
        sendTelemetryException({
          functionName: "revokeWalletInstances",
        }),
        E.orElseW(() => E.right(undefined)),
        RTE.fromEither,
      ),
    ),
  ),
);
