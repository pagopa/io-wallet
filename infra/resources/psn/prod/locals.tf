locals {
  environment = {
    prefix          = "iw"
    environment     = "p"
    domain          = "wallet"
    location        = "italynorth"
    instance_number = "01"
  }

  tags = {
    BusinessUnit = "IT-Wallet"
    CostCenter   = "TS000 - Tecnologia e Servizi"
    CreatedBy    = "Terraform"
    Environment  = "PROD"
    Source       = "https://github.com/pagopa/io-wallet/blob/main/infra/resources/psn/prod"
  }
}
