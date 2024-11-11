output "revocation_queue_name" {
  value = {
    name = azurerm_storage_queue.wallet_instances_revocation_check.name
  }
}


output "wallet_revocation_storage_connection_string_secret_name" {
  value = azurerm_key_vault_secret.wallet_revocation_storage_connection_string.name
}