# tfsec:ignore:azure-keyvault-ensure-secret-expiry
resource "azurerm_key_vault_secret" "app_insights_connection_string" {
  name         = "AppInsightsConnectionString"
  value        = data.azurerm_application_insights.common.connection_string
  key_vault_id = module.key_vaults.key_vault_wallet.id
  content_type = "token"
}
