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
      description  = "Check Status/Reason, SNAT exhaustion, and recent firewall changes."
      metric_name  = "FirewallHealth"
      aggregation  = "Average"
      operator     = "LessThan"
      threshold    = 100
    }
    throughput = {
      display_name = "High throughput"
      description  = "Review traffic spikes and scale or optimize firewall capacity and rules."
      metric_name  = "Throughput"
      aggregation  = "Average"
      operator     = "GreaterThan"
      threshold    = 8000000000
    }
    snat_port_utilization = {
      display_name = "High SNAT port usage"
      description  = "Check outbound flows; add public IPs or a NAT Gateway if exhaustion persists."
      metric_name  = "SNATPortUtilization"
      aggregation  = "Average"
      operator     = "GreaterThan"
      threshold    = 80
    }
  }

  appgw_alerts = {
    applicationgatewaytotaltime = {
      display_name = "Application Gateway Total Time"
      description  = "Metric Alert for App Gateway ApplicationGatewayTotalTime"
      metric       = "ApplicationGatewayTotalTime"
      aggregation  = "Average"
      dynamic      = true
      severity     = 2
    }
    backendlastbyteresponsetime = {
      display_name = "Backend Last Byte Response Time"
      description  = "Metric Alert for App Gateway BackendLastByteResponseTime"
      metric       = "BackendLastByteResponseTime"
      aggregation  = "Average"
      dynamic      = true
      severity     = 2
    }
    capacityunits = {
      display_name = "Capacity Units"
      description  = "Metric Alert for App Gateway Capacity Units"
      metric       = "CapacityUnits"
      aggregation  = "Average"
      threshold    = 75
      severity     = 2
    }
    computeunits = {
      display_name = "Compute Units"
      description  = "Metric Alert for App Gateway Compute Units"
      metric       = "ComputeUnits"
      aggregation  = "Average"
      threshold    = 75
      severity     = 2
    }
    failedrequests = {
      display_name = "Failed Requests"
      description  = "Metric Alert for App Gateway FailedRequests"
      metric       = "FailedRequests"
      aggregation  = "Total"
      dynamic      = true
      severity     = 1
    }
    responsestatus = {
      display_name = "Response Status"
      description  = "Metric Alert for App Gateway ResponseStatus"
      metric       = "ResponseStatus"
      aggregation  = "Total"
      dynamic      = true
      severity     = 2
      dimensions   = { HttpStatusGroup = ["4xx", "5xx"] }
    }
    unhealthyhostcount = {
      display_name = "Unhealthy Host Count"
      description  = "Metric Alert for App Gateway Unhealthy Host Count"
      metric       = "UnhealthyHostCount"
      aggregation  = "Average"
      threshold    = 20
      severity     = 0
    }
  }
}
