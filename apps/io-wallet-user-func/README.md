# IO Wallet - User Function

## Introduction

The `io-wallet-user-func` package is an Azure Function application that
provides various functionalities for end wallet users through APIs.

## Quickstart

To set up and run the `io-wallet-user-func` project, follow these steps:

1. Refer to the main [README.md](../../README.md) file to build the necessary
   packages and dependencies.
2. Run the following command to start the application:

```bash
yarn workspace io-wallet-user-func run start
```

3. Verify the function is running by visiting the health check API at:

```url
http://localhost:7071/api/v1/wallet/health
```

If everything is working correctly, you should receive the following response:

```json
{ "message": "it works!" }
```
