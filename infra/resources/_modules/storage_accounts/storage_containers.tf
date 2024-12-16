resource "azurerm_storage_container" "cosmos_01_backup" {
  name                  = "cosmos-01-backup"
  storage_account_name  = module.storage_account.name
  container_access_type = "private"
}
