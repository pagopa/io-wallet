resource "azurerm_storage_container" "cosmos_01_backup" {
  name                  = "cosmos-01-backup"
  storage_account_id    = azurerm_storage_account.common.id
  container_access_type = "private"
}

resource "azurerm_storage_container" "input" {
  name                  = "input"
  storage_account_id    = azurerm_storage_account.common.id
  container_access_type = "private"
}

resource "azurerm_storage_container" "output" {
  name                  = "output"
  storage_account_id    = azurerm_storage_account.common.id
  container_access_type = "private"
}
