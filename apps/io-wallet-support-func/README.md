# IO Wallet - Support Function

## Introduction

The `io-wallet-support-func` package is an Azure Function application that
provides various support and assistance functionalities through APIs.

## Quickstart

To set up and run the `io-wallet-support-func` project, follow these steps:

1. Refer to the main [README.md](../../README.md) file to build the necessary
   packages and dependencies.
2. Run the following command to start the application:

```bash
yarn workspace io-wallet-support-func run start
```

3. Verify the function is running by visiting the health check API at:

```url
http://localhost:7072/api/v1/wallet/health
```

If everything is working correctly, you should receive the following response:

```json
{ "message": "it works!" }
```
