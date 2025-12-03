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

  tags = {
    BusinessUnit = "IT-Wallet"
    CostCenter   = "TS000 - Tecnologia e Servizi"
    CreatedBy    = "Terraform"
    Environment  = "PROD"
    Source       = "https://github.com/pagopa/io-wallet/blob/main/infra/resources/psn/prod"
  }
}
