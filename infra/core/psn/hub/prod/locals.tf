locals {
  environment = {
    prefix          = "iw"
    environment     = "p"
    location        = "italynorth"
    instance_number = "01"
  }

  private_dns_zones_hub_links = [
    azurerm_private_dns_zone.azure_api_net.name,
    azurerm_private_dns_zone.management_azure_api_net.name,
    azurerm_private_dns_zone.scm_azure_api_net.name,
    azurerm_private_dns_zone.internal_wallet_io_pagopa_it.name
  ]

  private_dns_zones_spoke_links = [
    azurerm_private_dns_zone.kv.name,
    azurerm_private_dns_zone.hsm.name,
    azurerm_private_dns_zone.cosno.name,
    azurerm_private_dns_zone.asp.name,
    azurerm_private_dns_zone.blob.name,
    azurerm_private_dns_zone.queue.name,
    azurerm_private_dns_zone.table.name,
    azurerm_private_dns_zone.containerapp_itn.name,
    azurerm_private_dns_zone.acr.name,
    azurerm_private_dns_zone.monitor.name,
    azurerm_private_dns_zone.oms.name,
    azurerm_private_dns_zone.ods.name,
    azurerm_private_dns_zone.agentsvc.name,
    azurerm_private_dns_zone.azure_api_net.name,
    azurerm_private_dns_zone.management_azure_api_net.name,
    azurerm_private_dns_zone.scm_azure_api_net.name,
    azurerm_private_dns_zone.internal_wallet_io_pagopa_it.name
  ]

  spoke_vnet_name = "pagopa-Prod-ITWallet-spoke-italynorth"
  spoke_vnet_id   = "/subscriptions/725dede2-879b-45c5-82fa-eb816875b10c/resourceGroups/pagopa-Prod-ITWallet-rg-spoke-italynorth/providers/Microsoft.Network/virtualNetworks/pagopa-Prod-ITWallet-spoke-italynorth"

  vpn_client_address = "172.16.201.0/24"

  tags = {
    BusinessUnit = "IT-Wallet"
    CostCenter   = "TS000 - Tecnologia e Servizi"
    CreatedBy    = "Terraform"
    Environment  = "PROD"
    Source       = "https://github.com/pagopa/io-wallet/blob/main/infra/core/psn/hub/prod"
  }

  # The Microsoft assessment uses logical names for CPU and packet counters
  # that are not exposed by the Azure Firewall metric namespace. Keep only
  # documented metrics here until those signals can be mapped to capacity or
  # diagnostic-log queries without changing their meaning.
  firewall_alerts = {
    health = {
      display_name = "Degraded or unhealthy state"
      description  = "Azure Firewall health state fell below 100%. Investigate the Status and Reason dimensions."
      metric_name  = "FirewallHealth"
      aggregation  = "Average"
      operator     = "LessThan"
      threshold    = 100
    }
    throughput = {
      display_name = "High throughput"
      description  = "Azure Firewall throughput exceeded 1000000000 Bytes/sec (8000000000 Bits/sec). Monitor for traffic saturation and performance."
      metric_name  = "Throughput"
      aggregation  = "Average"
      operator     = "GreaterThan"
      threshold    = 8000000000
    }
    snat_port_utilization = {
      display_name = "High SNAT port usage"
      description  = "Azure Firewall SNAT port usage exceeded 80%. Check for SNAT exhaustion and scale accordingly."
      metric_name  = "SNATPortUtilization"
      aggregation  = "Average"
      operator     = "GreaterThan"
      threshold    = 80
    }
  }
}
