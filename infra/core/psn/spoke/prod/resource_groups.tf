resource "azurerm_resource_group" "terraform" {
  name = provider::dx::resource_name(merge(
    local.environment,
    {
      name          = "terraform",
      resource_type = "resource_group"
    }
  ))
  location = local.environment.location

  tags = local.tags
}

resource "azurerm_resource_group" "networking" {
  name     = local.networking.vnet.resource_group_name
  location = local.environment.location

  tags = local.tags
}

resource "azurerm_resource_group" "wallet" {
  name = provider::dx::resource_name(merge(
    local.environment,
    {
      name          = "wallet",
      resource_type = "resource_group"
    }
  ))
  location = local.environment.location

  tags = local.tags
}

resource "azurerm_resource_group" "monitoring" {
  name = provider::dx::resource_name(merge(
    local.environment,
    {
      name          = "monitoring",
      resource_type = "resource_group"
    }
  ))
  location = local.environment.location

  tags = local.tags
}

import {
  id = "/subscriptions/725dede2-879b-45c5-82fa-eb816875b10c/resourceGroups/iw-p-itn-monitoring-rg-01"
  to = azurerm_resource_group.monitoring
}
