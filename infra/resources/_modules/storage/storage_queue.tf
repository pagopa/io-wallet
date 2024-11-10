resource "azurerm_storage_queue" "wallet_instances_revocation_check" {
  name                 = "wallet-instances-revocation-check"
  storage_account_name = azurerm_storage_account.wallet_revocation_storage.name
}

resource "azurerm_key_vault_secret" "revocation_queue_connection_string" {
  name         = "StorageAccountQueueConnectionString"
  value        = data.azurerm_storage_account.wallet_revocation_storage.primary_connection_string
  key_vault_id = module.key_vaults.key_vault_wallet.id
  sensitive    = true
}
