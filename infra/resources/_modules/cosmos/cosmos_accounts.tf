resource "azurerm_cosmosdb_account" "apps" {
  name = provider::dx::resource_name(merge(
    var.environment,
    {
      resource_type = "cosmos_db_nosql"
    }
  ))

  resource_group_name = var.resource_group_name
  location            = var.environment.location
  offer_type          = "Standard"

  managed_hsm_key_id            = "https://pagopa-managedhsm.managedhsm.azure.net/keys/mdb001prod"
  default_identity_type         = local.identity_type
  local_authentication_disabled = var.secondary_location == null # temporary workaround to keep different values for the two tenant

  automatic_failover_enabled = true

  identity {
    type         = "UserAssigned"
    identity_ids = [var.user_assigned_managed_identity_id]
  }

  consistency_policy {
    consistency_level       = "Session"
    max_interval_in_seconds = null
    max_staleness_prefix    = null
  }

  geo_location {
    location          = var.environment.location
    failover_priority = 0
    zone_redundant    = true
  }

  dynamic "geo_location" {
    for_each = var.secondary_location == null ? [] : [var.secondary_location]
    content {
      location          = geo_location.value
      failover_priority = 1
      zone_redundant    = false
    }
  }

  public_network_access_enabled     = false
  is_virtual_network_filter_enabled = false

  backup {
    type = "Continuous"
  }

  tags = var.tags
}
