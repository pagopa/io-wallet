output "psn_identity" {
  value = {
    id                  = azurerm_user_assigned_identity.psn_01.id
    name                = azurerm_user_assigned_identity.psn_01.name
    resource_group_name = azurerm_user_assigned_identity.psn_01.resource_group_name
  }
}
