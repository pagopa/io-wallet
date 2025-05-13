import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";

export interface VoucherRepository {
  requestVoucher: () => TE.TaskEither<Error, string>;
}

export const requestVoucher: () => RTE.ReaderTaskEither<
  { voucherRepository: VoucherRepository },
  Error,
  string
> =
  () =>
  ({ voucherRepository }) =>
    voucherRepository.requestVoucher();
