resource "azurerm_storage_queue" "wallet_instances_revocation_check" {
  name                 = "wallet-instances-revocation-check"
  storage_account_name = module.storage_account.name
}
