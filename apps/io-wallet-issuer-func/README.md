# EUDIW IT Issuer - PID and (Q)EAA Provider Service

This repository contains a backend service written in TypeScript for issuing mocked European Digital Identity Wallet (EUDIW) credentials inside Italian specification. It implements the Person Identification Data (PID) and Qualified/Enhanced Attestation of Attributes (Q/EAA) Provider service, aligned with [OpenID for Verifiable Credential Issuance (draft 15)](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html) and the [Italian technical specifications](https://italia.github.io/eid-wallet-it-docs/versione-corrente/en/pid-eaa-issuance.html).

## Table of Contents

- [Overview](#overview)
- [Features](#features)
  - [Supported Credential Formats](#supported-credential-formats)
  - [Authentication Methods](#authentication-methods)
  - [OpenID4VCI Coverage](#openid4vci-coverage)
- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
  - [Build and Clean](#build-and-clean)
  - [Development](#development)
  - [Testing](#testing)

---

## Overview

This service acts as an Issuer for various verifiable credentials under the EUDIW framework. It currently supports:

- **Person Identification Data (PID)**
- **European Disability Card**
- **(Q)EAA Credentials** (e.g., age-over-18 pseudonym)
- **mDL** (mobile Driving License)

By default, it supports credential formats based on `mso_mdoc` and `SD-JWT-VC`. Communication follows the OpenID4VCI draft 15 standard, offering endpoints for:

- Authorization Code Flow
- Credential Issuance
- (Planned) Nonce Endpoint, DPoP, etc.

**Authentication** can be performed through:

- An OAUTH2 server
- A simple username/password form (for testing purposes only)

---

## Features

### Supported Credential Formats

| Credential/Attestation                     | Format    |
| ------------------------------------------ | --------- |
| **PID**                                    | SD-JWT-VC |
| **European Disability Card**               | SD-JWT-VC |
| **PID** (Planned)                          | mso_mdoc  |
| **mDL** (Planned)                          | mso_mdoc  |
| **(Q)EAA age-over-18 pseudonym** (Planned) | mso_mdoc  |

### Authentication Methods

- **OAUTH2**: Allows integration with existing OAuth flows.
- **Basic Form**: Primarily for local testing.

### OpenID4VCI Coverage

| Feature                                      | Coverage                                              |
| -------------------------------------------- | ----------------------------------------------------- |
| **Authorization Code flow**                  | ✅ Support for credential configuration ID, scope     |
| **Credential Offer**                         | ❌ Planned for a future release `authorization_code`, |
| **Dynamic Credential Request**               | ✅                                                    |
| **mso_mdoc format**                          | ❌                                                    |
| **SD-JWT-VC format**                         | ✅                                                    |
| **W3C VC DM**                                | ❌                                                    |
| **Token Endpoint**                           | ✅                                                    |
| **Credential Endpoint**                      | ✅ Includes proofs and repeatable invocations         |
| **Credential Issuer Metadata**               | ✅ openid-federation                                  |
| **Batch Endpoint**                           | ❌                                                    |
| **Deferred Endpoint**                        | ❌                                                    |
| **Proof**                                    | ✅ JWT, ❌ CWT                                        |
| **Credential response encryption**           | ❌                                                    |
| **Notification Endpoint**                    | ❌                                                    |
| **Nonce Endpoint**                           | ❌ Planned for a future release                       |
| **Pushed authorization request**             | ✅                                                    |
| **Wallet authentication**                    | ✅ Public client                                      |
| **Demonstrating Proof of Possession (DPoP)** | ✅                                                    |
| **PKCE**                                     | ✅                                                    |

---

## Requirements

- **Node.js** (>= 20.x recommended)
- **yarn** (>= 4.x recommended)
- **TypeScript** (>= 4.x)

---

## Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/pagopa/io-wallet.git
   cd apps/io-wallet-issuer-func

   ```

2. **Install dependencies**:

   ```bash
   yarn install

   ```

3. **(Optional) Install Azure Function extensions if needed**:
   ```bash
   yarn run extensions:install
   ```

## Usage

### Build

- **Build** the project:
  ```bash
  yarn build
  ```

### Development

During development, you can watch for file changes and rebuild automatically:

```bash
yarn build:watch
```

Then, to start the service locally:

```bash
yarn start
```

By default, this will start the Azure Function runtime on port 7071. Refer to local.settings.json for additional configuration details and environment variables.

### Testing

Run tests:

```bash
yarn test
```

Test coverage:

```bash
yarn test:coverage
```
