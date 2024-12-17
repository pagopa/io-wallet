output "revocation_queue_name" {
  value = {
    name = azurerm_storage_queue.wallet_instances_revocation_check.name
  }
}

output "revocation_queue_name_02" {
  value = {
    name = azurerm_storage_queue.wallet_instances_revocation_check_02.name
  }
}

output "send_email_queue_name_01" {
  value = {
    name = azurerm_storage_queue.send-email-01.name
  }
}

output "wallet" {
  value = {
    id                            = module.storage_account.id
    name                          = module.storage_account.name
    resource_group_name           = module.storage_account.resource_group_name
    connection_string_secret_name = azurerm_key_vault_secret.st_connection_string.name
  }
}
