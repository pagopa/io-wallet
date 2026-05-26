# This container is intentionally public because UAT wallet provider metadata must be publicly retrievable.
#trivy:ignore:AZU-0007 trivy:ignore:AVD-AZU-0007
resource "azurerm_storage_container" "wallet_provider" {
  name                  = "wallet-provider"
  storage_account_id    = azurerm_storage_account.trust_uat.id
  container_access_type = "blob"
}
