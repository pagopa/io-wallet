import * as L from "@pagopa/logger";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import * as t from "io-ts";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/infra/telemetry", () => ({
  sendTelemetryException: vi.fn(() => () => E.right(undefined)),
}));

import { sendTelemetryException } from "@/infra/telemetry";

import { StatusListPublicationHandler } from "../status-list-publication";

const statusListId = "status-list-1" as NonEmptyString;
const statusListQueueItem = {
  statusListId,
};

const logger = {
  format: L.format.simple,
  log: () => () => void 0,
};

describe("StatusListPublicationHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("publishes the queued status list", async () => {
    const publishStatusList = vi.fn().mockReturnValue(TE.right(undefined));

    const result = await StatusListPublicationHandler({
      input: statusListQueueItem,
      inputDecoder: t.type({
        statusListId: NonEmptyString,
      }),
      logger,
      statusListPublication: {
        listPublishableStatusListIds: TE.left(new Error("not implemented")),
        publishInitializingStatusList: () =>
          TE.left(new Error("not implemented")),
        publishStatusList,
      },
    })();

    expect(publishStatusList).toHaveBeenCalledWith(statusListId);
    expect(E.isRight(result)).toBe(true);
  });

  it("emits telemetry when queued publication fails", async () => {
    const publishStatusList = vi
      .fn()
      .mockReturnValue(TE.left(new Error("publish failed")));

    const result = await StatusListPublicationHandler({
      input: statusListQueueItem,
      inputDecoder: t.type({
        statusListId: NonEmptyString,
      }),
      logger,
      statusListPublication: {
        listPublishableStatusListIds: TE.left(new Error("not implemented")),
        publishInitializingStatusList: () =>
          TE.left(new Error("not implemented")),
        publishStatusList,
      },
    })();

    expect(vi.mocked(sendTelemetryException)).toHaveBeenCalledWith({
      functionName: "statusListPublication",
      statusListId,
    });
    expect(E.isLeft(result)).toBe(true);
  });
});
