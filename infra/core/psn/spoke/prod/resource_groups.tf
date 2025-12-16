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

resource "azurerm_resource_group" "gh_runner" {
  name = provider::dx::resource_name(merge(local.environment, {
    name          = "github-runner"
    resource_type = "resource_group",
  }))
  location = local.environment.location

  tags = local.tags
}
