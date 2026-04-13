resource "azurerm_storage_container" "wallet_provider" {
  name                  = "wallet-provider"
  storage_account_id    = azurerm_storage_account.trust_uat.id
  container_access_type = "blob"
}