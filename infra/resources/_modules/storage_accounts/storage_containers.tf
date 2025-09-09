resource "azurerm_storage_container" "cosmos_01_backup" {
  name                  = "cosmos-01-backup"
  storage_account_id    = module.storage_account.id
  container_access_type = "private"
}
