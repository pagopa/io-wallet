import * as L from "@pagopa/logger";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import * as t from "io-ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/infra/telemetry", () => ({
  sendTelemetryException: vi.fn(() => () => E.right(undefined)),
}));

import { StatusListPublicationMonitorHandler } from "@/infra/handlers/status-list-publication-monitor";
import { sendTelemetryException } from "@/infra/telemetry";

const statusListIdA = "status-list-a" as NonEmptyString;
const statusListIdB = "status-list-b" as NonEmptyString;
const statusListBaseUrl = "https://cdn.example.com";
const fetchMock = vi.fn();
const telemetryEffect = vi.fn(() => E.right(undefined));
const statusListPublicationMonitorConfig = {
  baseUrl: statusListBaseUrl,
};

const logger = {
  format: L.format.simple,
  log: () => () => void 0,
};

const getStatusListUrl = (statusListId: NonEmptyString) =>
  `${statusListBaseUrl}/${statusListId}`;

const getStatusListJwt = ({
  exp = Math.floor(Date.now() / 1000) + 13 * 60 * 60,
  statusListId,
  typ = "statuslist+jwt",
}: {
  exp?: number;
  statusListId: NonEmptyString;
  typ?: string;
}) =>
  `${Buffer.from(JSON.stringify({ typ })).toString("base64url")}.${Buffer.from(
    JSON.stringify({
      exp,
      status_list: {
        bits: 1,
        lst: "encoded-list",
      },
      sub: getStatusListUrl(statusListId),
    }),
  ).toString("base64url")}.`;

const getStatusListPublication = (
  statusListIds: readonly NonEmptyString[],
) => ({
  listPublishableStatusListIds: TE.right(statusListIds),
  publishInitializingStatusList: vi.fn().mockReturnValue(TE.right(undefined)),
  publishStatusList: vi.fn().mockReturnValue(TE.right(undefined)),
});

describe("StatusListPublicationMonitorHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sendTelemetryException).mockImplementation(() => telemetryEffect);
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("checks every publishable status list and alerts only on invalid results", async () => {
    fetchMock
      .mockResolvedValueOnce(
        // token expires in 13 hours
        new Response(getStatusListJwt({ statusListId: statusListIdA }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          getStatusListJwt({
            // token is already expired
            exp: Math.floor(Date.now() / 1000) - 1,
            statusListId: statusListIdB,
          }),
          {
            status: 200,
          },
        ),
      );

    const result = await StatusListPublicationMonitorHandler({
      input: undefined,
      inputDecoder: t.unknown,
      logger,
      statusListPublication: getStatusListPublication([
        statusListIdA,
        statusListIdB,
      ]),
      statusListPublicationMonitorConfig,
    })();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      getStatusListUrl(statusListIdA),
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      getStatusListUrl(statusListIdB),
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
    expect(telemetryEffect).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        message: `${statusListIdB} needs to be updated`,
      }),
    );
    expect(E.isRight(result)).toBe(true);
  });

  it("returns right and emits telemetry when checking a token status list fails", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("monitor failed"))
      .mockResolvedValueOnce(
        new Response(getStatusListJwt({ statusListId: statusListIdB }), {
          status: 200,
        }),
      );

    const result = await StatusListPublicationMonitorHandler({
      input: undefined,
      inputDecoder: t.unknown,
      logger,
      statusListPublication: getStatusListPublication([
        statusListIdA,
        statusListIdB,
      ]),
      statusListPublicationMonitorConfig,
    })();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      getStatusListUrl(statusListIdA),
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      getStatusListUrl(statusListIdB),
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
    expect(telemetryEffect).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        message: `${statusListIdA} needs to be updated`,
      }),
    );
    expect(E.isRight(result)).toBe(true);
    expect(result).toEqual(E.right(undefined));
  });

  it("returns right and emits telemetry when the token validity is less than 12 hours", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        getStatusListJwt({
          exp: Math.floor(Date.now() / 1000) + 11 * 60 * 60,
          statusListId: statusListIdA,
        }),
        {
          status: 200,
        },
      ),
    );

    const result = await StatusListPublicationMonitorHandler({
      input: undefined,
      inputDecoder: t.unknown,
      logger,
      statusListPublication: getStatusListPublication([statusListIdA]),
      statusListPublicationMonitorConfig,
    })();

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      getStatusListUrl(statusListIdA),
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
    expect(telemetryEffect).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        message: `${statusListIdA} needs to be updated`,
      }),
    );
    expect(E.isRight(result)).toBe(true);
    expect(result).toEqual(E.right(undefined));
  });
});
