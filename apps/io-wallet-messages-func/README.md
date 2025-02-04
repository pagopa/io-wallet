# IO Wallet - Messages Function

## Introduction

The `io-wallet-messages-func` package is an Azure Function application that
can be used to send wallet-related messages to users.

There is a first function `insertFiscalCodesInQueue` that is triggered by the upload of a blob into Azure Blob Storage. This blob is .csv file containing fiscal codes. The function inserts messages into an Azure Storage queue. Each message contains a batch of fiscal codes.
There is a second function `sendMessages` that is triggered by this queue and it calls the API to send the message for each fiscal code.

## Quickstart

To set up and run the `io-wallet-messages-func` project, follow these steps:

1. Refer to the main [README.md](../../README.md) file to build the necessary
   packages and dependencies.
2. Run the following command to start the application:

```bash
yarn workspace io-wallet-messages-func run start
```
