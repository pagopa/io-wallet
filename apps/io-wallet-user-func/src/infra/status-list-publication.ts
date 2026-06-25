import { CdnManagementClient } from "@azure/arm-cdn";
import { ContainerClient } from "@azure/storage-blob";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { ECPrivateKeyWithKid } from "io-wallet-common/jwk";
import * as jose from "jose";
import { v4 as uuidv4 } from "uuid";

import type { TokenStatusList } from "@/token-status-list";

import { CertificateRepository } from "@/certificates";
import {
  copyBlob,
  deleteBlob,
  downloadBlobText,
  existsBlob,
  uploadBlob,
} from "@/infra/azure/storage/blob";
import { signJwt } from "@/infra/crypto/signer";
import { StatusListPublication } from "@/status-list";
import { createTokenStatusList } from "@/token-status-list";
import { buildUrl } from "@/url";

const statusListBlobContentType = "application/statuslist+jwt";
const statusListBlobCacheControl = "public, max-age=43200";
const statusListJwtDuration = "24h";
const statusListJwtType = "statuslist+jwt";

const encodeTokenStatusListJwtPayload = ({
  statusList,
  statusListCredentialUrl,
}: TokenStatusList): jose.JWTPayload => ({
  status_list: statusList,
  sub: statusListCredentialUrl,
});

export interface StatusListPublicationCatalogDataSource {
  listPublishableStatusListIds: () => Promise<readonly NonEmptyString[]>;
}

export interface StatusListPublicationPagesDataSource {
  loadPageBitsetsForStatusList: (
    statusListId: NonEmptyString,
  ) => Promise<readonly Buffer[]>;
}

interface StatusListPublicationConfig {
  baseUrl: string;
  endpointName: string;
  profileName: string;
  resourceGroupName: string;
}

export class StatusListPublicationService implements StatusListPublication {
  readonly listPublishableStatusListIds: TE.TaskEither<
    Error,
    readonly NonEmptyString[]
  > = TE.tryCatch(
    () => this.catalogs.listPublishableStatusListIds(),
    this.toError,
  );

  constructor(
    protected readonly catalogs: StatusListPublicationCatalogDataSource,
    private readonly pages: StatusListPublicationPagesDataSource,
    private readonly tokenStatusListSigningKey: ECPrivateKeyWithKid,
    private readonly certificateRepository: CertificateRepository,
    protected readonly containerClient: ContainerClient,
    protected readonly cdnManagementClient: CdnManagementClient,
    protected readonly config: StatusListPublicationConfig,
    private readonly emptyBitstring: Buffer,
  ) {}

  readonly publishInitializingStatusList = (
    statusListId: NonEmptyString,
  ): TE.TaskEither<Error, void> =>
    pipe(
      buildUrl(statusListId, this.config.baseUrl),
      TE.right,
      TE.chainFirst((tokenStatusListUrl) =>
        pipe(
          this.hasValidPublishedInitializingStatusList(statusListId),
          TE.chainFirst((exists) =>
            exists
              ? TE.right(undefined)
              : pipe(
                  this.uploadInitializingStatusList(
                    statusListId,
                    tokenStatusListUrl,
                  ),
                ),
          ),
        ),
      ),
      TE.chain(this.checkPublishedStatusList),
    );

  readonly publishStatusList = (
    statusListId: NonEmptyString,
  ): TE.TaskEither<Error, void> =>
    pipe(
      this.loadPageBitString(statusListId),
      TE.chainW((bitString) =>
        pipe(
          buildUrl(statusListId, this.config.baseUrl),
          TE.right,
          TE.chainW((tokenStatusListUrl) =>
            pipe(
              this.signTokenStatusList({
                bitString,
                statusListCredentialUrl: tokenStatusListUrl,
              }),
              TE.chainW((tokenStatusList) =>
                this.publishStatusListToStorage(
                  statusListId,
                  statusListId,
                  tokenStatusList,
                ),
              ),
              TE.chainFirstW(() =>
                this.purgeStatusListContent(tokenStatusListUrl),
              ),
            ),
          ),
        ),
      ),
    );

  protected toError(error: unknown) {
    return error instanceof Error ? error : new Error(String(error));
  }

  private readonly checkPublishedStatusList = (
    url: string,
  ): TE.TaskEither<Error, void> =>
    pipe(
      TE.tryCatch(
        () =>
          fetch(url, {
            signal: AbortSignal.timeout(5000),
          }),
        this.toError,
      ),
      TE.chainW((response) =>
        response.ok
          ? TE.right(undefined)
          : TE.left(
              new Error(
                `Failed to fetch status list ${url} from CDN: HTTP ${response.status}`,
              ),
            ),
      ),
    );

  private readonly deleteStagingBlob = (
    blobName: string,
  ): TE.TaskEither<never, void> =>
    pipe(
      deleteBlob(blobName)({
        containerClient: this.containerClient,
      }),
      TE.orElseW(() => TE.right(undefined)),
    );

  private readonly hasValidPublishedInitializingStatusList = (
    blobName: string,
  ): TE.TaskEither<never, boolean> =>
    pipe(
      { containerClient: this.containerClient },
      existsBlob(blobName),
      TE.chainW((exists) =>
        exists
          ? pipe(
              downloadBlobText(blobName)({
                containerClient: this.containerClient,
              }),
              TE.chainW((jwt) =>
                pipe(
                  E.tryCatch(() => jose.decodeJwt(jwt), this.toError),
                  E.map(
                    ({ exp }) =>
                      typeof exp === "number" &&
                      exp > Math.floor(Date.now() / 1000),
                  ),
                  E.orElseW(() => E.right(false)),
                  TE.fromEither,
                ),
              ),
            )
          : TE.right(false),
      ),
      TE.orElseW(() => TE.right(false)),
    );

  private readonly loadPageBitString = (
    statusListId: NonEmptyString,
  ): TE.TaskEither<Error, Buffer> =>
    pipe(
      TE.tryCatch(
        () => this.pages.loadPageBitsetsForStatusList(statusListId),
        this.toError,
      ),
      TE.map(Buffer.concat),
    );

  private readonly publishStatusListToStorage = (
    statusListId: NonEmptyString,
    finalBlobName: string,
    tokenStatusList: string,
  ): TE.TaskEither<Error, void> =>
    pipe(`.staging/${statusListId}/${uuidv4()}`, (stagingBlobName) =>
      TE.bracket(
        uploadBlob({
          blobName: stagingBlobName,
          cacheControl: statusListBlobCacheControl,
          contentType: statusListBlobContentType,
          data: tokenStatusList,
        })({
          containerClient: this.containerClient,
        }),
        () =>
          pipe(
            downloadBlobText(stagingBlobName)({
              containerClient: this.containerClient,
            }),
            TE.chainW((stagedJwt) =>
              stagedJwt === tokenStatusList
                ? TE.right(undefined)
                : TE.left(
                    new Error(
                      `Staged status list ${stagingBlobName} does not match uploaded content`,
                    ),
                  ),
            ),
            TE.chainW(() =>
              copyBlob({
                sourceBlobName: stagingBlobName,
                targetBlobName: finalBlobName,
              })({
                containerClient: this.containerClient,
              }),
            ),
          ),
        () => this.deleteStagingBlob(stagingBlobName),
      ),
    );

  private readonly purgeStatusListContent = (
    tokenStatusListUrl: string,
  ): TE.TaskEither<Error, void> =>
    pipe(
      TE.tryCatch(
        () =>
          this.cdnManagementClient.afdEndpoints.beginPurgeContent(
            this.config.resourceGroupName,
            this.config.profileName,
            this.config.endpointName,
            {
              contentPaths: [new URL(tokenStatusListUrl).pathname],
            },
          ),
        this.toError,
      ),
      TE.map(() => undefined),
    );

  private readonly signTokenStatusList = ({
    bitString,
    statusListCredentialUrl,
  }: {
    bitString: Buffer;
    statusListCredentialUrl: string;
  }): TE.TaskEither<Error, string> =>
    pipe(
      this.certificateRepository.getCertificateChainByKid(
        this.tokenStatusListSigningKey.kid,
      ),
      TE.chain(TE.fromOption(() => new Error("Certificate chain not found"))),
      TE.chainW((x5c) =>
        signJwt(this.tokenStatusListSigningKey)({
          duration: statusListJwtDuration,
          header: {
            alg: "ES256",
            typ: statusListJwtType,
            x5c,
          },
          payload: encodeTokenStatusListJwtPayload(
            createTokenStatusList({
              bitString,
              statusListCredentialUrl,
            }),
          ),
        }),
      ),
    );

  private readonly uploadInitializingStatusList = (
    blobName: string,
    tokenStatusListUrl: string,
  ): TE.TaskEither<Error, void> =>
    pipe(
      this.signTokenStatusList({
        bitString: Buffer.from(this.emptyBitstring),
        statusListCredentialUrl: tokenStatusListUrl,
      }),
      TE.chainW((tokenStatusList) =>
        uploadBlob({
          blobName,
          cacheControl: statusListBlobCacheControl,
          contentType: statusListBlobContentType,
          data: tokenStatusList,
        })({
          containerClient: this.containerClient,
        }),
      ),
    );
}
