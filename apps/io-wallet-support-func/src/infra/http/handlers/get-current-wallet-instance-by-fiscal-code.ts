import * as H from "@pagopa/handler-kit";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as t from "io-ts";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";

import { getCurrentWalletInstance } from "@/wallet-instance";

import { WalletInstanceToApiModel } from "../encoders/wallet-instance";

const FiscalCodeBody = t.type({
  fiscal_code: FiscalCode,
});

const requireFiscalCode = (req: H.HttpRequest) =>
  pipe(
    req.body,
    H.parse(FiscalCodeBody),
    E.map(({ fiscal_code }) => fiscal_code),
  );

export const GetCurrentWalletInstanceByFiscalCodeHandler = H.of(
  (req: H.HttpRequest) =>
    pipe(
      req,
      requireFiscalCode,
      RTE.fromEither,
      RTE.chain(getCurrentWalletInstance),
      RTE.map(WalletInstanceToApiModel.encode),
      RTE.map(H.successJson),
      RTE.orElseW(logErrorAndReturnResponse),
    ),
);
