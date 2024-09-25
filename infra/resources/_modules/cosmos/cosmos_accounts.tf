resource "azurerm_cosmosdb_account" "wallet" {
  name                = "${var.project}-wallet-cosno-01"
  resource_group_name = var.resource_group_name
  location            = var.location
  offer_type          = "Standard"

  automatic_failover_enabled = true

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
}
