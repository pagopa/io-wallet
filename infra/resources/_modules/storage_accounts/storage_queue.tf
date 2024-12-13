resource "azurerm_storage_queue" "wallet_instances_revocation_check" {
  name                 = "wallet-instances-revocation-check"
  storage_account_name = module.storage_account.name
}

resource "azurerm_storage_queue" "wallet_instances_creation_check_01" {
  name                 = "wallet_instances_creation_check_01"
  storage_account_name = module.storage_account.name
}

resource "azurerm_storage_queue" "pid_issuer_revoke_api_01" {
  name                 = "pid-issuer-revoke-api-01"
  storage_account_name = module.storage_account.name
}
