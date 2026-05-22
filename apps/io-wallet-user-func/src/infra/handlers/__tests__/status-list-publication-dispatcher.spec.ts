import { QueueClient } from "@azure/storage-queue";
import * as L from "@pagopa/logger";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/Either";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import * as t from "io-ts";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/infra/azure/storage/queue", () => ({
  enqueue: vi.fn(),
}));

vi.mock("@/infra/telemetry", () => ({
  sendTelemetryException: vi.fn(() => () => E.right(undefined)),
}));

import { enqueue } from "@/infra/azure/storage/queue";
import { StatusListPublicationDispatcherHandler } from "@/infra/handlers/status-list-publication-dispatcher";
import { sendTelemetryException } from "@/infra/telemetry";

const statusListId1 = "status-list-1" as NonEmptyString;
const statusListId2 = "status-list-2" as NonEmptyString;

const logger = {
  format: L.format.simple,
  log: () => () => void 0,
};

const statusListPublication = {
  listPublishableStatusListIds: TE.right([statusListId1, statusListId2]),
  publishInitializingStatusList: vi.fn().mockReturnValue(TE.right(undefined)),
  publishStatusList: vi.fn().mockReturnValue(TE.right(undefined)),
};

describe("StatusListPublicationDispatcherHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enqueues every publishable status list", async () => {
    vi.mocked(enqueue).mockReturnValue(RTE.right(undefined));

    const result = await StatusListPublicationDispatcherHandler({
      input: undefined,
      inputDecoder: t.unknown,
      logger,
      queueClient: {} as QueueClient,
      statusListPublication,
    })();

    expect(vi.mocked(enqueue)).toHaveBeenNthCalledWith(1, {
      statusListId: statusListId1,
    });
    expect(vi.mocked(enqueue)).toHaveBeenNthCalledWith(2, {
      statusListId: statusListId2,
    });
    expect(E.isRight(result)).toBe(true);
  });

  it("continues enqueueing remaining status lists when one enqueue fails", async () => {
    vi.mocked(enqueue)
      .mockReturnValueOnce(RTE.left(new Error("enqueue failed")))
      .mockReturnValueOnce(RTE.right(undefined));

    const result = await StatusListPublicationDispatcherHandler({
      input: undefined,
      inputDecoder: t.unknown,
      logger,
      queueClient: {} as QueueClient,
      statusListPublication,
    })();

    expect(vi.mocked(enqueue)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(sendTelemetryException)).toHaveBeenCalledWith({
      functionName: "statusListPublicationDispatcher",
      statusListId: statusListId1,
    });
    expect(E.isRight(result)).toBe(true);
  });
});
