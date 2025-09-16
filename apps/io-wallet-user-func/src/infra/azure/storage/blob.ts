import { ContainerClient } from "@azure/storage-blob";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";

export const uploadFile: (
  data: string,
) => RTE.ReaderTaskEither<{ containerClient: ContainerClient }, Error, void> =
  (data) =>
  ({ containerClient }) =>
    pipe(
      TE.tryCatch(
        () =>
          containerClient
            .getBlockBlobClient("openid-federation")
            .upload(data, data.length, {
              blobHTTPHeaders: {
                blobContentType: "application/entity-statement+jwt",
              },
            }),
        E.toError,
      ),
      TE.filterOrElse(
        (response) => response.errorCode === undefined,
        (response) => new Error(response.errorCode),
      ),
      TE.map(() => undefined),
    );
