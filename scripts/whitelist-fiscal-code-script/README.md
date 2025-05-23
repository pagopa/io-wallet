# Whitelist Fiscal Code Script

This script adds fiscal codes to the whitelist in the database.

### Prerequisites

- NodeJS ^22.15.0
- NPM ^10.9.2

### Quickstart

**STEP 1**
Prepare a CSV file that contains all fiscal codes to add in the whitelist. The CSV file must have a column named (preferably `fiscalCode`, but anything is fine) and the values must be the fiscal codes to be whitelisted, like this:

```csv
fiscalCode
TEST0000001
TEST0000002
TEST0000003
TEST0000004
TEST0000005
```

To see a simple example, view the `fiscalcodes.csv.example` file, stored in the root directory of this script.

You can create a simple CSV file for testing by the following command:

```bash
cp fiscalcodes.csv.example fiscalcodes.csv
```

By default, the script considers a file called `fiscalcodes.csv` under the root directory of the script (`scripts/whitelist-fiscal-code-script`).

**STEP 2**
Make sure you have a `.env` file under the root directory with the following variables:

```bash
DATABASE_CONNECTION_STRING          # (required) the connection string to the database, you can find it in the azure portal
DATABASE_NAME                       # (required) the database name
DATABASE_CONTAINER_NAME             # (required) the container name of the database
SLEEP_TIME_BETWEEN_REQUESTS_MS      # (optional, default 500) the time to wait between requests to the database, in milliseconds
REQUEST_TIMEOUT_MS                  # (optional, default 10000) the timeout for each request to the database, in milliseconds
```

You can easily create the `.env` file by copying the `.env.example` with this command:

```bash
cp .env.example .env
```

**STEP 3**
So, you can run the script by running the following commands:

```bash
yarn install                     # install all dependencies
yarn start                       # run the script
```

**STEP 4**
After the script execution, you can see two output files under the `logs/` directory:

- `fiscal-codes-statuses.csv`: a CSV file containing the status of each fiscal code. If the status is `OK`, the fiscal code was inserted successfully; if status is `NOT_OK` a problem occurred. See `app.log` for more details.
- `app.log`: here you can see all logs produced by the script execution.

### Script Arguments

This script accepts two arguments:

- `input`: the CSV file containing the fiscal code to add in the whitelist. The default value is `fiscalcodes.csv`.
- `outputDir`: the output directory containing the results of the script execution. The default value is `logs/`.

For example, you can run this script in the following ways:

```bash
# using the default values
yarn start

# specifying the input file only
yarn start --input=fiscalcodes.csv

# specifying the outputDir only
yarn start --outputDir=logs/

# specifying both input file and outputDir
yarn start --input=fiscalcodes.csv --outputDir=logs/
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
```
