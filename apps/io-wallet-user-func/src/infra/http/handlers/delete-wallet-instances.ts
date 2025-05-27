import { revokeAllCredentials } from "@/credential";
import { VoucherRepository } from "@/voucher";
import { deleteUserWalletInstances } from "@/wallet-instance";
import * as H from "@pagopa/handler-kit";
import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { sendTelemetryException } from "io-wallet-common/infra/azure/appinsights/telemetry";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";

import { requireFiscalCodeFromHeader } from "../fiscal-code";

const requestVoucher: () => RTE.ReaderTaskEither<
  {
    voucherRepository: VoucherRepository;
  },
  Error,
  string
> =
  () =>
  ({ voucherRepository }) =>
    voucherRepository.requestVoucher();

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
        RTE.chainW(() => requestVoucher()),
        RTE.chainW((accessToken) =>
          revokeAllCredentials(fiscalCode, accessToken),
        ),
        RTE.map(() => H.empty),
        RTE.orElseFirstW((error) =>
          pipe(
            sendTelemetryException(error, {
              fiscalCode,
              functionName: "deleteWalletInstances",
            }),
            RTE.fromReader,
          ),
        ),
      ),
    ),
    RTE.orElseW(logErrorAndReturnResponse),
  ),
);
