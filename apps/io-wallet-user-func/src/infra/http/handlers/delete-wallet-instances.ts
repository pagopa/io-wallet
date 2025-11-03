import * as H from "@pagopa/handler-kit";
import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";

import { revokeAllCredentials } from "@/credential";
import { sendTelemetryException } from "@/infra/telemetry";
import { deleteUserWalletInstances } from "@/wallet-instance";

import { requireFiscalCodeFromHeader } from "../fiscal-code";

// delete wallet instances from `wallet-instances-user-id` collection
export const DeleteWalletInstancesHandler = H.of((req: H.HttpRequest) =>
  pipe(
    req,
    requireFiscalCodeFromHeader,
    RTE.fromEither,
    RTE.chainW((fiscalCode) =>
      pipe(
        fiscalCode,
        deleteUserWalletInstances,
        RTE.chainW(() => revokeAllCredentials(fiscalCode)),
        RTE.map(() => H.empty),
        RTE.orElseFirstW((error) =>
          RTE.fromIO(
            pipe(
              error,
              sendTelemetryException({
                fiscalCode,
                functionName: "deleteWalletInstances",
              }),
            ),
          ),
        ),
      ),
    ),
    RTE.orElseW(logErrorAndReturnResponse),
  ),
);
