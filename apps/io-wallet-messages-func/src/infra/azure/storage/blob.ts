import { ContainerClient } from "@azure/storage-blob";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import * as E from "fp-ts/lib/Either";
import { v4 as uuidv4 } from "uuid";

class StorageBlobError extends Error {
  errorCode?: string;
  name = "StorageBlobError";
  constructor(errorCode?: string) {
    super("Unable to upload the file.");
    this.errorCode = errorCode;
  }
}

export const uploadFile: (
  buffer: Buffer<ArrayBuffer>,
) => RTE.ReaderTaskEither<
  { containerClient: ContainerClient },
  StorageBlobError,
  void
> =
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
      TE.filterOrElse(
        (response) => response.errorCode === undefined,
        (response) => new StorageBlobError(response.errorCode),
      ),
      TE.map(() => undefined),
    );
