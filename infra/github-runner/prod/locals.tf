locals {
  prefix         = "io"
  env_short      = "p"
  location       = "italynorth"
  location_short = "itn"
  domain         = "wallet"
  project        = "${local.prefix}-${local.env_short}-${local.location_short}"

  repo_name = "io-wallet"

  tags = {
    CostCenter     = "TS700 - ENGINEERING"
    CreatedBy      = "Terraform"
    Environment    = "Prod"
    Owner          = "IO"
    ManagementTeam = "IO Wallet"
    Source         = "https://github.com/pagopa/io-wallet/infra/github-runner/prod"
  }
}
