locals {
  environment = {
    prefix          = "iw"
    environment     = "p"
    location        = "italynorth"
    instance_number = "01"
  }

  project = "${local.environment.prefix}-${local.environment.environment}-${local.environment.location}-%s-${local.environment.instance_number}"

  networking = {
    hub = {
      resource_group_name = "pagopa-rg-hub-network-italynorth"
    }
    vnet = {
      name                = "pagopa-Prod-ITWallet-spoke-italynorth"
      resource_group_name = "pagopa-Prod-ITWallet-rg-spoke-italynorth"
    }
    next_hope_type = "VirtualAppliance"
    firewall_ip    = "10.251.0.68"
  }

  tags = {
    BusinessUnit = "IT-Wallet"
    CostCenter   = "TS000 - Tecnologia e Servizi"
    CreatedBy    = "Terraform"
    Environment  = "PROD"
    Source       = "https://github.com/pagopa/io-wallet/blob/main/infra/core/psn/spoke/prod"
  }
}
