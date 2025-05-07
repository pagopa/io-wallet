# Whitelist Fiscal Code Script

This script is used to whitelist fiscal codes in the database.

### Prerequisites

- NodeJS ^22.15.0
- NPM ^10.9.2

### Quickstart

**STEP 1**
Make sure there is a CSV file under the `fiscalCodes/` directory. This directory is used to store the fiscal codes to be whitelisted and the file name must be `fiscalcodes.csv`. This CSV file must have a column named `fiscalCode` and the values must be the fiscal codes to be whitelisted, like this:

```csv
fiscalCode
TEST0000001
TEST0000002
TEST0000003
TEST0000004
TEST0000005
```

**STEP 2**
Make sure you have a `.env` file under the root directory with the following variables:

```bash
DATABASE_CONNECTION_STRING          # (required) the connection string to the database, you can find it in the azure portal
SLEEP_TIME_BETWEEN_REQUESTS_MS      # (optional, default 500) the time to wait between requests to the database, in milliseconds
REQUEST_TIMEOUT_MS                  # (optional, default 10000) the timeout for each request to the database, in milliseconds
```

**STEP 3**
So, you can run the script by running the following commands:

```bash
yarn install                     # install all dependencies
yarn start                       # run the script
```

### Useful commands

```bash
yarn format                      # format the code
yarn lint                        # run linting
yarn lint:fix                    # fix linting errors
yarn test                        # run tests
yarn test:coverage               # run tests and generate coverage report
yarn install                     # install all dependencies
yarn start                       # run the script
yarn build                       # build the script
```
