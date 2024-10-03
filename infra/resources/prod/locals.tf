locals {
  prefix         = "io"
  env_short      = "p"
  location_short = "itn"
  # the project on which the resources will be created
  # it's the prefix of any resource name
  # it includes the choosen location
  project = "${local.prefix}-${local.env_short}-${local.location_short}"

  # some referenced resources are in a different location
  # for historical reasons
  # this project points to them (westeurope)
  project_legacy = "${local.prefix}-${local.env_short}"

  location           = "italynorth"
  secondary_location = "germanywestcentral"

  apim = {
    name                = "${local.project_legacy}-apim-v2-api"
    resource_group_name = "${local.project_legacy}-rg-internal"
    products = {
      io_web = {
        product_id = "io-web-api"
      }
    }
  }

  tags = {
    CostCenter     = "TS310 - PAGAMENTI & SERVIZI"
    CreatedBy      = "Terraform"
    Environment    = "Prod"
    Owner          = "IO"
    ManagementTeam = "IO Wallet"
    Source         = "https://github.com/pagopa/io-wallet/blob/main/infra/resources/prod"
  }

  user_func = {
    app_settings = [
      {
        name                  = "GoogleAppCredentialsEncoded"
        key_vault_secret_name = "GoogleAppCredentialsEncoded"
      },
      {
        name                  = "WalletKeys"
        key_vault_secret_name = "WalletKeys"
      },
      {
        name                  = "TrialSystemApiKey"
        key_vault_secret_name = "TrialSystemApiKey"
      },
      {
        name                  = "PidIssuerApiClientPrivateKey"
        key_vault_secret_name = "PidIssuerApiClientPrivateKey"
      }
    ]
  }
}
