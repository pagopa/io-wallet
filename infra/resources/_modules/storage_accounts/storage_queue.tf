resource "azurerm_storage_queue" "wallet-instance-creation-email-queue-01" {
  name               = "wallet-instance-creation-email-queue-01"
  storage_account_id = azurerm_storage_account.common.id
}

resource "azurerm_storage_queue" "wallet-instance-revocation-email-queue-01" {
  name               = "wallet-instance-revocation-email-queue-01"
  storage_account_id = azurerm_storage_account.common.id
}

resource "azurerm_storage_queue" "status-list-publication-queue-01" {
  name               = "status-list-publication-queue-01"
  storage_account_id = azurerm_storage_account.common.id
}

resource "azurerm_storage_queue" "wallet-instance-creation-email-queue-uat" {
  name               = "wallet-instance-creation-email-queue-01"
  storage_account_id = azurerm_storage_account.common_uat.id
}

resource "azurerm_storage_queue" "wallet-instance-revocation-email-queue-uat" {
  name               = "wallet-instance-revocation-email-queue-01"
  storage_account_id = azurerm_storage_account.common_uat.id
}

resource "azurerm_storage_queue" "status-list-publication-queue-uat" {
  name               = "status-list-publication-queue-01"
  storage_account_id = azurerm_storage_account.common_uat.id
}
