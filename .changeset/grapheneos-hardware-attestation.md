---
"io-wallet-user-func": minor
"io-wallet-common": minor
---

Support Android devices running GrapheneOS with a locked bootloader through hardware key attestation, following the [GrapheneOS attestation compatibility guide](https://grapheneos.org/articles/attestation-compatibility-guide):

- the key attestation accepts the `SelfSigned` verified boot state when the verified boot key is included in the official GrapheneOS list (https://grapheneos.org/attestation.json, verified with the pinned GrapheneOS key) and the app signing certificate matches `AndroidSigningCertificateDigests`;
- the wallet instance key must be attested by an app attest key on GrapheneOS, whose public key is pinned at registration;
- the integrity assertions accept the optional `hardware_key_attestation` field, a fresh key attestation which is verified as fallback when the Play Integrity token is missing or not valid, and must be signed by the pinned attest key;
- the Play Integrity verdict is now actually enforced: failed verdicts were previously accepted.
