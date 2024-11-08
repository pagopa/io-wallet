resource "azurerm_storage_account" "wallet_revocation_storage" {
  name                      = "${replace(var.project, "-", "")}walletrevocationstorage01"
  resource_group_name       = var.resource_group_name
  location                  = var.location
  account_tier              = "Standard"
  account_kind              = "StorageV2"
  account_replication_type  = "ZRS"
  shared_access_key_enabled = false
  min_tls_version           = "TLS1_2"

  tags = var.tags
}
