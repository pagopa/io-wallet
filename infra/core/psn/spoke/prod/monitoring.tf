locals {
  pep_ampls_name = provider::dx::resource_name(merge(
    local.environment,
    {
      name          = "ampls"
      resource_type = "private_endpoint"
    }
  ))
}

resource "azurerm_log_analytics_workspace" "this" {
  name = provider::dx::resource_name(merge(
    local.environment,
    {
      name          = "core"
      resource_type = "log_analytics"
    }
  ))
  location            = local.environment.location
  resource_group_name = azurerm_resource_group.monitoring.name

  retention_in_days          = 90
  internet_ingestion_enabled = false
  internet_query_enabled     = false

  tags = local.tags
}

resource "azurerm_application_insights" "this" {
  name = provider::dx::resource_name(merge(
    local.environment,
    {
      name          = "core"
      resource_type = "application_insights"
    }
  ))
  location            = local.environment.location
  resource_group_name = azurerm_resource_group.monitoring.name

  application_type = "other"
  workspace_id     = azurerm_log_analytics_workspace.this.id

  disable_ip_masking         = true
  internet_ingestion_enabled = false
  internet_query_enabled     = false

  tags = local.tags
}

resource "azurerm_monitor_private_link_scope" "wallet" {
  name                = "iw-p-itn-core-pls-01"
  resource_group_name = azurerm_resource_group.monitoring.name

  ingestion_access_mode = "PrivateOnly"
  query_access_mode     = "PrivateOnly"

  tags = local.tags
}

resource "azurerm_monitor_private_link_scoped_service" "log" {
  name                = azurerm_log_analytics_workspace.this.name
  resource_group_name = azurerm_resource_group.monitoring.name
  scope_name          = azurerm_monitor_private_link_scope.wallet.name
  linked_resource_id  = azurerm_log_analytics_workspace.this.id
}

resource "azurerm_monitor_private_link_scoped_service" "appi" {
  name                = azurerm_application_insights.this.name
  resource_group_name = azurerm_resource_group.monitoring.name
  scope_name          = azurerm_monitor_private_link_scope.wallet.name
  linked_resource_id  = azurerm_application_insights.this.id
}

resource "azurerm_private_endpoint" "ampls" {
  name                = local.pep_ampls_name
  location            = local.environment.location
  resource_group_name = azurerm_resource_group.monitoring.name
  subnet_id           = azurerm_subnet.pep.id

  private_service_connection {
    name                           = local.pep_ampls_name
    private_connection_resource_id = azurerm_monitor_private_link_scope.wallet.id
    is_manual_connection           = false
    subresource_names              = ["azuremonitor"]
  }

  private_dns_zone_group {
    name = "private-dns-zone-group"
    private_dns_zone_ids = [
      data.azurerm_private_dns_zone.blob.id,
      data.azurerm_private_dns_zone.monitor.id,
      data.azurerm_private_dns_zone.oms.id,
      data.azurerm_private_dns_zone.ods.id,
      data.azurerm_private_dns_zone.agentsvc.id,
    ]
  }

  tags = local.tags
}
