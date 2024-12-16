resource "azurerm_storage_queue" "wallet_instances_revocation_check" {
  name                 = "wallet-instances-revocation-check"
  storage_account_name = module.storage_account.name
}

resource "azurerm_storage_queue" "wallet_instances_revocation_check_02" {
  name                 = "wallet-instances-revocation-check-02"
  storage_account_name = module.storage_account.name
}

resource "azurerm_storage_queue" "pid_issuer_revoke_api_01" {
  name                 = "pid-issuer-revoke-api-01"
  storage_account_name = module.storage_account.name
}

resource "azurerm_storage_queue" "send-email-01" {
  name                 = "send-email-01"
  storage_account_name = module.storage_account.name
}
