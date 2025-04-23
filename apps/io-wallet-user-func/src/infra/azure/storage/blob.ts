import { ContainerClient } from "@azure/storage-blob";
import * as E from "fp-ts/Either";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";

export const uploadFile: (
  data: string,
) => RTE.ReaderTaskEither<{ containerClient: ContainerClient }, never, void> =
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
      TE.map(() => undefined),
      TE.orElse(() => TE.right(undefined)), // TODO. comunque se non riesce a fare upload lasciamo quello vecchio
    );
