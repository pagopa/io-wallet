resource "azurerm_user_assigned_identity" "cosmos" {
  resource_group_name = var.resource_group_name
  location            = var.location
  name                = "${var.project}-wallet-cosmos-id-01"
}

resource "azurerm_role_assignment" "key_vault" {
  role_definition_name = "Key Vault Crypto Service Encryption User"
  scope                = var.key_vault.id
  principal_id         = azurerm_user_assigned_identity.cosmos.principal_id
}
