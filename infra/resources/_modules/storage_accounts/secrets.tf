resource "azurerm_key_vault_secret" "st_connection_string" {
  count = var.key_vault_wallet_id != null ? 1 : 0

  name         = "StorageConnectionString"
  value        = azurerm_storage_account.common.primary_connection_string
  key_vault_id = var.key_vault_wallet_id
  content_type = "connection string"
}

resource "azurerm_key_vault_secret" "st_uat_connection_string" {
  count = var.key_vault_wallet_id != null ? 1 : 0

  name         = "StorageUatConnectionString"
  value        = azurerm_storage_account.common_uat.primary_connection_string
  key_vault_id = var.key_vault_wallet_id
  content_type = "connection string"
}
