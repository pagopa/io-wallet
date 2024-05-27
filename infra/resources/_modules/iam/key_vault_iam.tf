resource "azurerm_role_assignment" "admins" {
  for_each = var.key_vault.admin_ids

  role_definition_name = "Key Vault Administrator"
  scope                = var.key_vault.id
  principal_id         = each.value
}
