resource "azurerm_user_assigned_identity" "psn_01" {
  name = provider::dx::resource_name(merge(
    var.environment,
    {
      resource_type = "managed_identity"
    }
  ))
  resource_group_name = var.resource_group_name
  location            = var.environment.location

  tags = var.tags

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_management_lock" "psn_id_01" {
  name       = azurerm_user_assigned_identity.psn_01.name
  scope      = azurerm_user_assigned_identity.psn_01.id
  lock_level = "CanNotDelete"
  notes      = "This Managed Identity is used to get the CMK from the HSM erogated by PSN. If deleted, services depending on it will stop working."
}
