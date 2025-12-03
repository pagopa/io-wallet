locals {
  environment = {
    prefix          = "iw"
    environment     = "p"
    location        = "italynorth"
    instance_number = "01"
  }

  spoke = {
    name                = "pagopa-Prod-ITWallet-spoke-italynorth"
    resource_group_name = "pagopa-Prod-ITWallet-rg-spoke-italynorth"
  }

  hub = {
    resource_group_name = "pagopa-rg-hub-network-italynorth"
  }

  tags = {
    BusinessUnit = "IT-Wallet"
    CostCenter   = "TS000 - Tecnologia e Servizi"
    CreatedBy    = "Terraform"
    Environment  = "PROD"
    Source       = "https://github.com/pagopa/io-wallet/blob/main/infra/resources/psn/prod"
  }
}
