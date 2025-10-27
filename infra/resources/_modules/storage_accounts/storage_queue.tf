resource "azurerm_storage_queue" "wallet-instance-creation-email-queue-01" {
  name                 = "wallet-instance-creation-email-queue-01"
  storage_account_name = module.storage_account.name
}

resource "azurerm_storage_queue" "wallet-instance-revocation-email-queue-01" {
  name                 = "wallet-instance-revocation-email-queue-01"
  storage_account_name = module.storage_account.name
}

resource "azurerm_storage_queue" "wallet-instance-creation-email-queue-uat" {
  name                 = "wallet-instance-creation-email-queue-01"
  storage_account_name = module.storage_account_uat.name
}

resource "azurerm_storage_queue" "wallet-instance-revocation-email-queue-uat" {
  name                 = "wallet-instance-revocation-email-queue-01"
  storage_account_name = module.storage_account_uat.name
}
