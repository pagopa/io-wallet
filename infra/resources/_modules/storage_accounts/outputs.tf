output "wallet_instance_creation_email_queue_name_01" {
  value = {
    name = azurerm_storage_queue.wallet-instance-creation-email-queue-01.name
  }
}

output "wallet_instance_revocation_email_queue_name_01" {
  value = {
    name = azurerm_storage_queue.wallet-instance-revocation-email-queue-01.name
  }
}

output "wallet" {
  value = {
    id                            = azurerm_storage_account.common.id
    name                          = azurerm_storage_account.common.name
    resource_group_name           = azurerm_storage_account.common.resource_group_name
  }
}

output "wallet_uat" {
  value = {
    id                            = azurerm_storage_account.common_uat.id
    name                          = azurerm_storage_account.common_uat.name
    resource_group_name           = azurerm_storage_account.common_uat.resource_group_name
    connection_string_secret_name = try(azurerm_key_vault_secret.st_uat_connection_string[0].name, null)
  }
}
