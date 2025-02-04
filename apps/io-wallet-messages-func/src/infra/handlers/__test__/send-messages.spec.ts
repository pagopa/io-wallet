import { CodeError } from "@/message";
import { BlobUploadCommonResponse, ContainerClient } from "@azure/storage-blob";
import * as L from "@pagopa/logger";
import * as TE from "fp-ts/TaskEither";
import * as t from "io-ts";
import { describe, expect, it } from "vitest";

import { SendMessagesHandler } from "../send-messages";

describe("SendMessagesHandler", () => {
  const sendMessage = () => () => TE.right("messageId");

  const input = "AAABBB91E17H501J\nZZZBBB91E17H501J";

  const logger = {
    format: L.format.simple,
    log: () => () => void 0,
  };

  const containerClient = {
    getBlockBlobClient: () => ({
      uploadData: () =>
        Promise.resolve({ errorCode: undefined } as BlobUploadCommonResponse),
    }),
  } as unknown as ContainerClient;

  const handler = SendMessagesHandler({
    containerClient,
    input,
    inputDecoder: t.string,
    logger,
    sendMessage,
  });

  it("should return right on success", async () => {
    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: undefined,
    });
  });

  it("should return right on failure", async () => {
    const sendMessageThatFails = () => () => TE.left(new CodeError(429));
    const handler = SendMessagesHandler({
      containerClient,
      input,
      inputDecoder: t.string,
      logger,
      sendMessage: sendMessageThatFails,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: undefined,
    });
  });
});
