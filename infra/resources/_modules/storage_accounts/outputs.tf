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
    id                  = azurerm_storage_account.common.id
    name                = azurerm_storage_account.common.name
    resource_group_name = azurerm_storage_account.common.resource_group_name
  }
}

output "wallet_uat" {
  value = {
    id                  = azurerm_storage_account.common_uat.id
    name                = azurerm_storage_account.common_uat.name
    resource_group_name = azurerm_storage_account.common_uat.resource_group_name
  }
}

output "trust_uat" {
  value = {
    name                = azurerm_storage_account.trust_uat.name
    primary_blob_endpoint = azurerm_storage_account.trust_uat.primary_blob_endpoint
    resource_group_name = azurerm_storage_account.trust_uat.resource_group_name
  }
}

output "trust_uat_wallet_provider_container" {
  value = {
    name = azurerm_storage_container.wallet_provider.name
  }
}
