locals {
  environment = {
    prefix          = "io"
    environment     = "p"
    location        = "italynorth"
    instance_number = "01"
  }

  project = "${local.environment.prefix}-${local.environment.environment}-itn"

  tags = {
    CostCenter     = "TS310 - PAGAMENTI & SERVIZI"
    CreatedBy      = "Terraform"
    BusinessUnit   = "IT Wallet"
    Environment    = "Prod"
    ManagementTeam = "IO Wallet"
    Source         = "https://github.com/pagopa/io-wallet/blob/main/infra/core/pagopa/prod"
  }
}
