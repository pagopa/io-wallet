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

  firewall_alerts = {
    cpu_utilization = {
      display_name = "High CPU utilization"
      description  = "Azure Firewall CPU utilization exceeded 80%. Consider scaling or optimizing rule sets."
      metric_name  = "FirewallCPUUtilization"
      threshold    = 80
    }
    throughput = {
      display_name = "High throughput"
      description  = "Azure Firewall throughput exceeded 1000000000 Bytes/sec. Monitor for traffic saturation and performance."
      metric_name  = "FirewallThroughput"
      threshold    = 1000000000
    }
    snat_port_usage = {
      display_name = "High SNAT port usage"
      description  = "Azure Firewall SNAT port usage exceeded 80%. Check for SNAT exhaustion and scale accordingly."
      metric_name  = "SNATPortUsage"
      threshold    = 80
    }
    dropped_packets = {
      display_name = "High dropped packet count"
      description  = "Azure Firewall dropped packets exceeded 1000. Investigate rule misconfigurations or threats."
      metric_name  = "DroppedPackets"
      threshold    = 1000
    }
    allowed_packets = {
      display_name = "High allowed packet count"
      description  = "Azure Firewall allowed packets exceeded 100000. Ensure traffic patterns align with expectations."
      metric_name  = "AllowedPackets"
      threshold    = 100000
    }
    denied_packets = {
      display_name = "High denied packet count"
      description  = "Azure Firewall denied packets exceeded 500. Review denied traffic for potential threats or misconfigurations."
      metric_name  = "DeniedPackets"
      threshold    = 500
    }
  }
}
