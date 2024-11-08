import { revokeInvalidWalletInstances } from "@/wallet-instance-revocation-process";
import * as H from "@pagopa/handler-kit";

export const ValidateWalletInstanceAttestedKeyHandler = H.of(
  revokeInvalidWalletInstances,
);
