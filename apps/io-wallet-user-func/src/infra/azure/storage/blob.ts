import { ContainerClient } from "@azure/storage-blob";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";

interface BlobContainerEnvironment {
  containerClient: ContainerClient;
}

interface UploadBlobInput {
  blobName: string;
  cacheControl?: string;
  contentType: string;
  data: string;
}

export const existsBlob =
  (
    blobName: string,
  ): RTE.ReaderTaskEither<BlobContainerEnvironment, Error, boolean> =>
  ({ containerClient }) =>
    TE.tryCatch(
      () => containerClient.getBlobClient(blobName).exists(),
      E.toError,
    );

export const uploadBlob =
  ({
    blobName,
    cacheControl,
    contentType,
    data,
  }: UploadBlobInput): RTE.ReaderTaskEither<
    BlobContainerEnvironment,
    Error,
    void
  > =>
  ({ containerClient }) =>
    pipe(
      TE.tryCatch(
        () =>
          containerClient
            .getBlockBlobClient(blobName)
            .upload(data, Buffer.byteLength(data), {
              blobHTTPHeaders: {
                ...(cacheControl !== undefined
                  ? { blobCacheControl: cacheControl }
                  : {}),
                blobContentType: contentType,
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

export const downloadBlobText =
  (
    blobName: string,
  ): RTE.ReaderTaskEither<BlobContainerEnvironment, Error, string> =>
  ({ containerClient }) =>
    pipe(
      TE.tryCatch(
        async () =>
          containerClient
            .getBlobClient(blobName)
            .downloadToBuffer()
            .then((buffer) => buffer.toString("utf8")),
        E.toError,
      ),
    );

export const copyBlob =
  ({
    sourceBlobName,
    targetBlobName,
  }: {
    sourceBlobName: string;
    targetBlobName: string;
  }): RTE.ReaderTaskEither<BlobContainerEnvironment, Error, void> =>
  ({ containerClient }) =>
    pipe(
      TE.tryCatch(async () => {
        const sourceBlobClient = containerClient.getBlobClient(sourceBlobName);
        const targetBlobClient = containerClient.getBlobClient(targetBlobName);
        const poller = await targetBlobClient.beginCopyFromURL(
          sourceBlobClient.url,
        );
        const response = await poller.pollUntilDone();

        if (response.copyStatus !== "success") {
          throw new Error(
            `Unexpected copy status ${response.copyStatus ?? "unknown"}`,
          );
        }
      }, E.toError),
    );

export const deleteBlob =
  (
    blobName: string,
  ): RTE.ReaderTaskEither<BlobContainerEnvironment, Error, void> =>
  ({ containerClient }) =>
    pipe(
      TE.tryCatch(
        () => containerClient.getBlobClient(blobName).deleteIfExists(),
        E.toError,
      ),
      TE.map(() => undefined),
    );

export const uploadFile: (
  data: string,
) => RTE.ReaderTaskEither<{ containerClient: ContainerClient }, Error, void> = (
  data,
) =>
  uploadBlob({
    blobName: "openid-federation",
    contentType: "application/entity-statement+jwt",
    data,
  });
