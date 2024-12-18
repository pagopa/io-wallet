locals {
  prefix         = "io"
  env_short      = "p"
  location_short = "itn"
  domain         = "wallet"
  # the project on which the resources will be created
  # it's the prefix of any resource name
  # it includes the choosen location
  project = "${local.prefix}-${local.env_short}-${local.location_short}"

  # some referenced resources are in a different location
  # for historical reasons
  # this project points to them (westeurope)
  project_legacy = "${local.prefix}-${local.env_short}"

  location           = "italynorth"
  secondary_location = "spaincentral"

  apim = {
    name                = "${local.project_legacy}-apim-v2-api"
    resource_group_name = "${local.project_legacy}-rg-internal"
    products = {
      io_web = {
        product_id = "io-web-api"
      }
    }
  }

  apim_itn = {
    name                = "${local.project}-apim-01"
    resource_group_name = "${local.project}-common-rg-01"
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
      },
      {
        name                  = "SlackStatusChannelWebhook"
        key_vault_secret_name = "SlackStatusChannelWebhook"
      },
      {
        name                  = "AllowedDeveloperUsers"
        key_vault_secret_name = "AllowedDeveloperUsers"
      },
      {
        name                  = "StorageConnectionString"
        key_vault_secret_name = module.storage_accounts.wallet.connection_string_secret_name
      },
      {
        name                  = "AppInsightsConnectionString"
        key_vault_secret_name = "AppInsightsConnectionString"
      },
      {
        name                  = "AuthProfileApiKey"
        key_vault_secret_name = "AuthProfileApiKey"
      },
      {
        name                  = "MailupUsername"
        key_vault_secret_name = "MailupUsername"
      },
      {
        name                  = "MailupSecret"
        key_vault_secret_name = "MailupSecret"
      },
      {
        name                  = "WhitelistEmail"
        key_vault_secret_name = "WhitelistEmail"
      }
    ]
  }

  support_func = {
    app_settings = [
      {
        name                  = "AppInsightsConnectionString"
        key_vault_secret_name = "AppInsightsConnectionString"
      }
    ]
  }
}
