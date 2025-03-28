import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";

export interface VoucherRepository {
  requestVoucher: (clientId: string) => TE.TaskEither<Error, string>;
}

export const requestVoucher: (
  clientId: string,
) => RTE.ReaderTaskEither<
  { voucherRepository: VoucherRepository },
  Error,
  string
> =
  (clientId) =>
  ({ voucherRepository }) =>
    voucherRepository.requestVoucher(clientId);
