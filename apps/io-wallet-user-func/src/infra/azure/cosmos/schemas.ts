import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { z } from "zod";

export const nonEmptyStringSchema = z
  .string()
  .min(1)
  .transform((value) => value as NonEmptyString);

export const nonEmptyEntityIdsSchema = z
  .array(
    z.object({
      id: nonEmptyStringSchema,
    }),
  )
  .transform((documents) => documents.map(({ id }) => id));
