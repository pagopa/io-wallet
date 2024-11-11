output "revocation_queue_name" {
  value = {
    name = azurerm_storage_queue.wallet_instances_revocation_check.name
  }
}

output "wallet" {
  value = {
    id                  = module.storage_account.id
    name                = module.storage_account.name
    resource_group_name = module.storage_account.resource_group_name
  }
}
