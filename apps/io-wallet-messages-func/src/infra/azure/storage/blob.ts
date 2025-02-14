import { ContainerClient } from "@azure/storage-blob";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import * as E from "fp-ts/lib/Either";
import { v4 as uuidv4 } from "uuid";

export const uploadFile: (
  buffer: Buffer<ArrayBuffer>,
) => RTE.ReaderTaskEither<{ containerClient: ContainerClient }, never, void> =
  (buffer) =>
  ({ containerClient }) =>
    pipe(
      TE.tryCatch(
        () =>
          containerClient
            .getBlockBlobClient(`output-${uuidv4()}.csv`)
            .uploadData(buffer),
        E.toError,
      ),
      TE.map(() => undefined),
      TE.orElse(() => TE.right(undefined)),
    );
