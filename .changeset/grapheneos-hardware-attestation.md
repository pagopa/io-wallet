---
"io-wallet-user-func": minor
"io-wallet-common": minor
---

Support Android devices running GrapheneOS with a locked bootloader through hardware key attestation, following the [GrapheneOS attestation compatibility guide](https://grapheneos.org/articles/attestation-compatibility-guide):

- the key attestation accepts the `SelfSigned` verified boot state when the verified boot key is included in the official GrapheneOS list (https://grapheneos.org/attestation.json, verified with the pinned GrapheneOS key) and the app signing certificate matches `AndroidSigningCertificateDigests`;
- the wallet instance key must be attested by an app attest key on GrapheneOS, whose public key is pinned at registration;
- the integrity assertions accept the optional `hardware_key_attestation` field, a fresh key attestation which is verified as fallback when the Play Integrity token is missing or not valid. It is accepted only for wallet instances registered with an attest key, must be signed by that pinned attest key and must report a trusted app signing certificate (`AndroidSigningCertificateDigests`) for any verified boot state: the wallet instances without attest key, e.g. stock devices running Android 8-11, keep requiring Play Integrity.
