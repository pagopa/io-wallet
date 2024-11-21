resource "azurerm_user_assigned_identity" "psn_01" {
  name                = "${var.project}-wallet-cosno-psn-id-01"
  resource_group_name = var.resource_group_name
  location            = var.location

  tags = var.tags
}
