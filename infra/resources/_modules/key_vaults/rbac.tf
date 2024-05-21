resource "azurerm_role_assignment" "admins" {
  for_each = var.key_vault_admin_ids

  role_definition_name = "Key Vault Administrator"
  scope                = azurerm_key_vault.wallet.id
  principal_id         = each.value
}
