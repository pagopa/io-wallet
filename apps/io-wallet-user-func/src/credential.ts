import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";

import { VoucherRepository } from "./infra/voucher";

export interface CredentialRepository {
  revokeAllCredentials: (
    fiscalCode: FiscalCode,
    accessToken: string,
  ) => TE.TaskEither<Error, void>;
}

export const revokeAllCredentials: (
  fiscalCode: FiscalCode,
) => RTE.ReaderTaskEither<
  {
    credentialRepository: CredentialRepository;
    voucherRepository: VoucherRepository;
  },
  Error,
  void
> =
  (fiscalCode) =>
  ({ credentialRepository, voucherRepository }) =>
    pipe(
      voucherRepository.requestVoucher(),
      TE.chain((accessToken) =>
        credentialRepository.revokeAllCredentials(fiscalCode, accessToken),
      ),
    );
