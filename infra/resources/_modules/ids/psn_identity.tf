resource "azurerm_user_assigned_identity" "psn_01" {
  name                = "${var.project}-wallet-psn-id-01"
  resource_group_name = var.resource_group_name
  location            = var.location

  tags = var.tags

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_management_lock" "psn_id_01" {
  name       = azurerm_user_assigned_identity.psn_01.name
  scope      = azurerm_user_assigned_identity.psn_01.id
  lock_level = "CanNotDelete"
  notes      = "This Managed Identity is federated with PSN tenant and is required to read data stored in services using PSN's CMK"
}
