locals {
  st_pep_name = provider::dx::resource_name(merge(
    local.environment,
    {
      name          = "tf"
      resource_type = "blob_private_endpoint"
    }
  ))
}

resource "azurerm_storage_account" "terraform" {
  name                = "iwpitntfst01"
  resource_group_name = azurerm_resource_group.terraform.name
  location            = azurerm_resource_group.terraform.location

  account_tier             = "Standard"
  account_kind             = "StorageV2"
  account_replication_type = "ZRS"

  public_network_access_enabled   = false
  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = false
  default_to_oauth_authentication = true

  tags = local.tags
}

resource "azurerm_private_endpoint" "storage_terraform" {
  name                = local.st_pep_name
  location            = azurerm_resource_group.terraform.location
  resource_group_name = azurerm_resource_group.terraform.name
  subnet_id           = azurerm_subnet.pep.id

  private_service_connection {
    name                           = local.st_pep_name
    private_connection_resource_id = azurerm_storage_account.terraform.id
    is_manual_connection           = false
    subresource_names              = ["blob"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.blob.id]
  }

  tags = local.tags
}
