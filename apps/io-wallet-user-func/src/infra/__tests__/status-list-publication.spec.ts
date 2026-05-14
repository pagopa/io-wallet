import { CdnManagementClient } from "@azure/arm-cdn";
import { ContainerClient } from "@azure/storage-blob";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/infra/azure/storage/blob", () => ({
  copyBlob: vi.fn(),
  deleteBlob: vi.fn(),
  downloadBlobText: vi.fn(),
  existsBlob: vi.fn(),
  uploadBlob: vi.fn(),
}));

vi.mock("@/token-status-list", async () => {
  const actual = await vi.importActual<typeof import("@/token-status-list")>(
    "@/token-status-list",
  );

  return {
    ...actual,
    createTokenStatusList: vi.fn(),
  };
});

import {
  copyBlob,
  deleteBlob,
  downloadBlobText,
  existsBlob,
  uploadBlob,
} from "@/infra/azure/storage/blob";
import { StatusListPublicationService } from "@/infra/status-list-publication";
import { Signer } from "@/signer";
import { createTokenStatusList } from "@/token-status-list";

const statusListId = "status-list-1" as NonEmptyString;
const emptyBitstring = Buffer.alloc(4);
const statusListUrl = `https://cdn.example.com/${statusListId}`;
const signer = {} as Signer;
const fetchMock = vi.fn();

const rightBlobTask =
  <A>(value: A) =>
  () =>
    TE.right(value);

const rightJwtReader =
  <A>(value: A) =>
  () =>
    TE.right(value);

const leftJwtReader = (error: Error) => () => TE.left(error);

const leftBlobTask = (error: Error) => () => TE.left(error);

const getDecodedJwt = (payload: Record<string, unknown>) =>
  `${Buffer.from(JSON.stringify({ typ: "statuslist+jwt" })).toString("base64url")}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.`;

const getFetchResponse = (jwt: string) =>
  new Response(jwt, {
    status: 200,
  });

const getService = () => {
  const catalogs = {
    listPublishableStatusListIds: vi.fn().mockResolvedValue([]),
  };

  const pages = {
    loadPageBitsetsForStatusList: vi.fn().mockResolvedValue([Buffer.alloc(1)]),
  };

  const cdnManagementClient = {
    afdEndpoints: {
      beginPurgeContent: vi.fn().mockResolvedValue(undefined),
    },
  } as unknown as CdnManagementClient;

  return {
    catalogs,
    cdnManagementClient,
    pages,
    service: new StatusListPublicationService(
      catalogs,
      pages,
      signer,
      {} as ContainerClient,
      cdnManagementClient,
      {
        baseUrl: "https://cdn.example.com",
        endpointName: "endpoint",
        profileName: "profile",
        resourceGroupName: "resource-group",
      },
      emptyBitstring,
    ),
  };
};

describe("StatusListPublicationService.publishInitializingStatusList", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(createTokenStatusList).mockReturnValue(
      leftJwtReader(
        new Error(
          "createTokenStatusList must be mocked explicitly when publication builds a JWT",
        ),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reuses an existing valid blob and still checks availability from the CDN", async () => {
    const { service } = getService();

    vi.mocked(existsBlob).mockReturnValue(rightBlobTask(true));
    vi.mocked(downloadBlobText).mockReturnValue(
      rightBlobTask(
        getDecodedJwt({ exp: Math.floor(Date.now() / 1000) + 3600 }),
      ),
    );
    fetchMock.mockResolvedValue(getFetchResponse("cdn-jwt"));

    const result = await service.publishInitializingStatusList(statusListId)();

    expect(E.isRight(result)).toBe(true);
    expect(vi.mocked(createTokenStatusList)).not.toHaveBeenCalled();
    expect(vi.mocked(uploadBlob)).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      statusListUrl,
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("builds and uploads a new JWT when the blob does not exist", async () => {
    const { service } = getService();

    vi.mocked(existsBlob).mockReturnValue(rightBlobTask(false));
    vi.mocked(createTokenStatusList).mockReturnValue(
      rightJwtReader("candidate-jwt"),
    );
    vi.mocked(uploadBlob).mockReturnValue(rightBlobTask(undefined));
    fetchMock.mockResolvedValue(getFetchResponse("cdn-jwt"));

    const result = await service.publishInitializingStatusList(statusListId)();

    expect(E.isRight(result)).toBe(true);
    expect(vi.mocked(createTokenStatusList)).toHaveBeenCalledOnce();
    expect(vi.mocked(uploadBlob)).toHaveBeenCalledWith({
      blobName: statusListId,
      cacheControl: "public, max-age=43200",
      contentType: "application/statuslist+jwt",
      data: "candidate-jwt",
    });
    expect(vi.mocked(downloadBlobText)).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("builds and uploads a new JWT when the existing blob cannot be reused", async () => {
    const { service } = getService();

    vi.mocked(existsBlob).mockReturnValue(rightBlobTask(true));
    vi.mocked(createTokenStatusList).mockReturnValue(
      rightJwtReader("candidate-jwt"),
    );
    vi.mocked(uploadBlob).mockReturnValue(rightBlobTask(undefined));
    vi.mocked(downloadBlobText).mockReturnValueOnce(
      rightBlobTask(
        getDecodedJwt({ exp: Math.floor(Date.now() / 1000) - 3600 }),
      ),
    );
    fetchMock.mockResolvedValue(getFetchResponse("cdn-jwt"));

    const result = await service.publishInitializingStatusList(statusListId)();

    expect(E.isRight(result)).toBe(true);
    expect(vi.mocked(createTokenStatusList)).toHaveBeenCalledOnce();
    expect(vi.mocked(uploadBlob)).toHaveBeenCalledOnce();
    expect(vi.mocked(downloadBlobText)).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("returns left when checking the published blob fails and rebuilding also fails", async () => {
    const { service } = getService();

    vi.mocked(existsBlob).mockReturnValue(
      leftBlobTask(new Error("exists failed")),
    );

    const result = await service.publishInitializingStatusList(statusListId)();

    expect(E.isLeft(result)).toBe(true);
    expect(vi.mocked(createTokenStatusList)).toHaveBeenCalledOnce();
    expect(vi.mocked(uploadBlob)).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not promote a staged status list when downloaded content differs from the uploaded JWT", async () => {
    const { service } = getService();

    vi.mocked(createTokenStatusList).mockReturnValue(
      rightJwtReader("candidate-jwt"),
    );
    vi.mocked(uploadBlob).mockReturnValue(rightBlobTask(undefined));
    vi.mocked(deleteBlob).mockReturnValue(rightBlobTask(undefined));
    vi.mocked(downloadBlobText).mockReturnValue(rightBlobTask("different-jwt"));

    const result = await service.publishStatusList(statusListId)();

    expect(result).toMatchObject({
      _tag: "Left",
      left: expect.objectContaining({
        message: `Staged status list .staging/${statusListId} does not match uploaded content`,
      }),
    });
    expect(vi.mocked(copyBlob)).not.toHaveBeenCalled();
  });
});
