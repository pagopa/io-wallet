output "storage_account_queue" {
  value = {
    primary_connection_string = azurerm_storage_account.wallet_revocation_storage.primary_connection_string
  }
}

output "revocation_queue_name" {
  value = {
    name = azurerm_storage_queue.wallet_instances_revocation_check.name
  }
}
