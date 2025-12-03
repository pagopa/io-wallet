locals {
  pep_blob_name = provider::dx::resource_name(merge(
    var.environment,
    {
      resource_type = "blob_private_endpoint"
    }
  ))
  pep_queue_name = provider::dx::resource_name(merge(
    var.environment,
    {
      resource_type = "queue_private_endpoint"
    }
  ))
  pep_blob_name_uat = provider::dx::resource_name(merge(
    var.environment,
    {
      environment   = var.u_env_short
      resource_type = "blob_private_endpoint"
    }
  ))
  pep_queue_name_uat = provider::dx::resource_name(merge(
    var.environment,
    {
      environment   = var.u_env_short
      resource_type = "queue_private_endpoint"
    }
  ))
}

resource "azurerm_private_endpoint" "storage_account_common_blob" {
  name                = local.pep_blob_name
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint.subnet_pep_id

  private_service_connection {
    name                           = local.pep_blob_name
    private_connection_resource_id = azurerm_storage_account.common.id
    is_manual_connection           = false
    subresource_names              = ["blob"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [var.private_endpoint.blob_private_dns_zone_id]
  }

  tags = var.tags
}

resource "azurerm_private_endpoint" "storage_account_common_queue" {
  name                = local.pep_queue_name
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint.subnet_pep_id

  private_service_connection {
    name                           = local.pep_queue_name
    private_connection_resource_id = azurerm_storage_account.common.id
    is_manual_connection           = false
    subresource_names              = ["queue"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [var.private_endpoint.queue_private_dns_zone_id]
  }

  tags = var.tags
}

resource "azurerm_private_endpoint" "storage_account_common_blob_uat" {
  name                = local.pep_blob_name_uat
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint.subnet_pep_id

  private_service_connection {
    name                           = local.pep_blob_name_uat
    private_connection_resource_id = azurerm_storage_account.common_uat.id
    is_manual_connection           = false
    subresource_names              = ["blob"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [var.private_endpoint.blob_private_dns_zone_id]
  }

  tags = var.tags
}

resource "azurerm_private_endpoint" "storage_account_common_queue_uat" {
  name                = local.pep_queue_name_uat
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint.subnet_pep_id

  private_service_connection {
    name                           = local.pep_queue_name_uat
    private_connection_resource_id = azurerm_storage_account.common_uat.id
    is_manual_connection           = false
    subresource_names              = ["queue"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [var.private_endpoint.queue_private_dns_zone_id]
  }

  tags = var.tags
}
