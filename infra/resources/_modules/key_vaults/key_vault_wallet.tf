resource "azurerm_key_vault" "wallet" {
  name                = "${var.project}-wallet-kv-01"
  location            = var.location
  resource_group_name = var.resource_group_name
  tenant_id           = var.tenant_id
  sku_name            = "premium"

  enabled_for_disk_encryption   = true
  enable_rbac_authorization     = true
  soft_delete_retention_days    = 90
  purge_protection_enabled      = true
  public_network_access_enabled = true

  network_acls {
    bypass         = "AzureServices"
    default_action = "Allow" #tfsec:ignore:AZU020
  }

  tags = var.tags
}
