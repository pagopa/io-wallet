locals {
  prefix    = "io"
  env_short = "p"
  repo_name = "io-wallet"

  tags = {
    CostCenter     = "TS310 - PAGAMENTI & SERVIZI"
    CreatedBy      = "Terraform"
    Environment    = "Prod"
    Owner          = "IO"
    ManagementTeam = "IO Comunicazione"
    Source         = "https://github.com/pagopa/io-wallet/infra/github-runner/prod"
  }
}
