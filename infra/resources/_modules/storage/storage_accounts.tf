resource "azurerm_storage_account" "wallet_revocation_storage" {
  name                      = "${replace(var.project, "-", "")}walletrevocation01"
  resource_group_name       = var.resource_group_name
  location                  = var.location
  account_tier              = "Standard"
  account_kind              = "StorageV2"
  account_replication_type  = "ZRS"
  shared_access_key_enabled = false
  min_tls_version           = "TLS1_2"

  tags = var.tags
}

data "azurerm_storage_account" "wallet_revocation_storage_data" {
  name                = azurerm_storage_account.wallet_revocation_storage.name
  resource_group_name = var.resource_group_name
}

resource "azurerm_key_vault_secret" "wallet_revocation_storage_connection_string" {
  name         = "WalletRevocationStorageConnectionString"
  value        = data.azurerm_storage_account.wallet_revocation_storage_data.primary_connection_string
  key_vault_id = var.key_vault_wallet_id
}