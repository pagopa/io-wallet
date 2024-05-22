resource "azurerm_cosmosdb_account" "wallet" {
  name                = "${var.project}-wallet-cosno-01"
  resource_group_name = var.resource_group_name
  location            = var.location
  offer_type          = "Standard"

  default_identity_type = join("=", ["UserAssignedIdentity", azurerm_user_assigned_identity.cosmos.id])
  key_vault_key_id      = var.key_vault.key_versionless_id

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.cosmos.id]
  }

  consistency_policy {
    consistency_level       = "Strong"
    max_interval_in_seconds = null
    max_staleness_prefix    = null
  }

  geo_location {
    location          = var.location
    failover_priority = 0
    zone_redundant    = true
  }

  geo_location {
    location          = var.secondary_location
    failover_priority = 1
    zone_redundant    = false
  }

  public_network_access_enabled     = false
  is_virtual_network_filter_enabled = false

  backup {
    type = "Continuous"
  }

  tags = var.tags

  depends_on = [
    azurerm_role_assignment.key_vault
  ]
}
