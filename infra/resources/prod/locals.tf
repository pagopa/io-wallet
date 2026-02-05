locals {
  environment = {
    prefix          = "io"
    env_short       = "p"
    location        = "italynorth"
    domain          = "wallet"
    instance_number = "01"
  }
  location_short = "itn"
  # the project on which the resources will be created
  # it's the prefix of any resource name
  # it includes the choosen location
  project = "${local.environment.prefix}-${local.environment.env_short}-${local.location_short}"

  # some referenced resources are in a different location
  # for historical reasons
  # this project points to them (westeurope)
  project_legacy = "${local.environment.prefix}-${local.environment.env_short}"

  secondary_location = "spaincentral"

  wallet_dns_zone = {
    name                = "wallet.io.pagopa.it"
    resource_group_name = "io-p-rg-external"
  }

  apim = {
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
}
