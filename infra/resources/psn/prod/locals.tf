locals {
  environment = {
    prefix          = "iw"
    environment     = "p"
    location        = "italynorth"
    instance_number = "01"
  }

  project = "${local.environment.prefix}-${local.environment.environment}-itn"

  spoke = {
    name                = "pagopa-Prod-ITWallet-spoke-italynorth"
    resource_group_name = "pagopa-Prod-ITWallet-rg-spoke-italynorth"
  }

  hub = {
    resource_group_name = "pagopa-rg-hub-network-italynorth"
  }

  hsm_key_url = "https://pagopa-managedhsm.managedhsm.azure.net/keys/mdb001prod"

  user_func = {
    app_settings = [
      {
        name                  = "GoogleAppCredentialsEncoded"
        key_vault_secret_name = "GoogleAppCredentialsEncoded"
      },
      {
        name                  = "FederationEntitySigningKeys"
        key_vault_secret_name = "FederationEntitySigningKeys"
      },
      {
        name                  = "WalletProviderSigningKeys"
        key_vault_secret_name = "WalletProviderSigningKeys"
      },
      {
        name                  = "PidIssuerApiClientPrivateKey"
        key_vault_secret_name = "PidIssuerApiClientPrivateKey"
      },
      {
        name                  = "AllowedDeveloperUsers"
        key_vault_secret_name = "AllowedDeveloperUsers"
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
        name                  = "CosmosAccountConnectionString"
        key_vault_secret_name = "CosmosAccountConnectionString"
      },
      {
        name                  = "PagoPACosmosDbConnectionString"
        key_vault_secret_name = "PagoPACosmosDbConnectionString"
      }
    ]
  }

  backend_paths = {
    user_v1    = "/api/wallet/v1"
    user_uat   = "/api/wallet/v1"
    support_v1 = "/api/wallet/v1"
  }

  tags = {
    BusinessUnit = "IT-Wallet"
    CostCenter   = "TS000 - Tecnologia e Servizi"
    CreatedBy    = "Terraform"
    Environment  = "PROD"
    Source       = "https://github.com/pagopa/io-wallet/blob/main/infra/resources/psn/prod"
  }
}
