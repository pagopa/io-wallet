locals {
  kv_pep_name = provider::dx::resource_name(merge(
    var.environment,
    {
      resource_type = "key_vault_private_endpoint"
    }
  ))
}

resource "azurerm_key_vault" "wallet" {
  name = provider::dx::resource_name(merge(
    var.environment,
    {
      resource_type = "key_vault"
    }
  ))
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  tenant_id           = var.tenant_id
  sku_name            = "standard"

  enabled_for_disk_encryption   = true
  soft_delete_retention_days    = 90
  purge_protection_enabled      = true
  public_network_access_enabled = true
  rbac_authorization_enabled    = true

  network_acls {
    bypass         = "AzureServices"
    default_action = var.private_endpoint == null ? "Allow" : "Deny" #tfsec:ignore:AZU020
  }

  tags = var.tags
}

resource "azurerm_private_endpoint" "kv_wallet" {
  count = var.private_endpoint == null ? 0 : 1

  name                = local.kv_pep_name
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint.subnet_pep_id

  private_service_connection {
    name                           = local.kv_pep_name
    private_connection_resource_id = azurerm_key_vault.wallet.id
    is_manual_connection           = false
    subresource_names              = ["vault"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [var.private_endpoint.private_dns_zone_group_id]
  }

  tags = var.tags
}
