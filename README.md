# io-wallet
EUDI Wallet and Italian Wallet implementation for App IO

## Related repositories:
- 🪪 [io-react-native-wallet](https://github.com/pagopa/io-react-native-wallet)
- 🔐 [io-react-native-jwt](https://github.com/pagopa/io-react-native-jwt)
  
## Prerequisites

In order to run the applications locally you need the following tool installed on your machine.

- `Node.js`
- `yarn`

The preferred way to set up the local environment is using [nodenv](https://github.com/nodenv/nodenv) to manage `Node.js` installation and `corepack` (included with `Node.js`) to manage the installation of `yarn`.
Please refer to `.node-version` for the actual runtime version used.


## Bundles
Applications are bundled into zip file into the `./bundles` folder.

```sh
# Install dependencies
yarn
# Build applications
yarn build
# Bundle packages 
yarn build:package
# Check created bundles
ls ./bundles
```


## Useful commands

This project uses `yarn@3` with workspaces to manage projects and dependencies. Here is a list of useful commands to work in this repo.

### Work with workspaces

```bash
# to execute COMMAND on WORKSPACE_NAME
yarn workspace WORKSPACE_NAME run command
# to execute COMMAD on all workspaces
yarn workspace foreach run command

# run unit tests on my-package
yarn workspace my-package run test

# run the typecheck script on all workspaces
yarn workspaces foreach run typecheck

# generate the API models for all workspaces
yarn workspaces foreach run generate:api-models
```

### Add dependencies

```bash
# add a dependency to the workspace root
yarn add turbo

# add a jest as dev dependency on my-package
yarn workspace my-package add -D jest

# add io-ts as dependency on each workspace
yarn workspace foreach add io-ts
```

## Infrastructure resources

Resources are defined using `Terraform` into `/infra`. 

### Configure environment

`/infra/env` contains the configuration for the different environments the applications must be deployed on. Each subdirectory is an environemnt; the name of the subdirectory is the name of the environment. Each environment contains:
* `backend.ini`, in which we set the subscription to work on;
* `backend.tfvars`, where we reference the remote storage to keep the terraform state into;
* `terraform.tfvars`, where developers can set actual infrastructure variables.

### Infrastructure-as-code
Terraform code files are meant to be into `/infra/src`. Files must be in the same directory, that is there cannot be subdirectories.
The `main.ts` file initialize the required provider.

### Run Terraform commands

The script `/infra/terraform.sh` is a wrapper over the `terraform` CLI that:
* load the configuration for the selected environment
* connect to the remote storage for the Terraform state
* execute the command

To run a command, follow the pattern:
```sh
./infra/terraform.sh <command> <environment>
```

examples:
```sh
# Run plan on prod environment
./infra/terraform.sh plan prod 

# Run apply on dev environment
./infra/terraform.sh apply dev
```

### Precommit checks

Check your code before commit.

https://github.com/antonbabenko/pre-commit-terraform#how-to-install

```sh
pre-commit run -a
```
