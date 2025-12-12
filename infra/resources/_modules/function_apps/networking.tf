resource "azurerm_subnet" "func_user" {
  count = var.subnet_route_table_id == null ? 0 : 1

  name = provider::dx::resource_name(merge(
    var.environment,
    {
      name          = "user"
      resource_type = "function_subnet"
    }
    )
  )

  resource_group_name  = var.virtual_network.resource_group_name
  virtual_network_name = var.virtual_network.name

  address_prefixes = [var.cidr_subnet_user_func]

  delegation {
    name = "default"
    service_delegation {
      name    = "Microsoft.Web/serverFarms"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }
}

resource "azurerm_subnet" "func_support" {
  count = var.subnet_route_table_id == null ? 0 : 1

  name = provider::dx::resource_name(merge(
    var.environment,
    {
      name          = "support"
      resource_type = "function_subnet"
    }
    )
  )

  resource_group_name  = var.virtual_network.resource_group_name
  virtual_network_name = var.virtual_network.name

  address_prefixes = [var.cidr_subnet_support_func]

  delegation {
    name = "default"
    service_delegation {
      name    = "Microsoft.Web/serverFarms"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }
}

resource "azurerm_subnet" "func_user_uat" {
  count = var.subnet_route_table_id == null ? 0 : 1

  name = provider::dx::resource_name(merge(
    var.environment,
    {
      environment   = var.u_env_short
      name          = "user"
      resource_type = "function_subnet"
    }
    )
  )

  resource_group_name  = var.virtual_network.resource_group_name
  virtual_network_name = var.virtual_network.name

  address_prefixes = [var.cidr_subnet_user_uat_func]

  delegation {
    name = "default"
    service_delegation {
      name    = "Microsoft.Web/serverFarms"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }
}

resource "azurerm_subnet_route_table_association" "user_func" {
  count = var.subnet_route_table_id == null ? 0 : 1

  subnet_id      = azurerm_subnet.func_user[0].id
  route_table_id = var.subnet_route_table_id
}

resource "azurerm_subnet_route_table_association" "support_func" {
  count = var.subnet_route_table_id == null ? 0 : 1

  subnet_id      = azurerm_subnet.func_support[0].id
  route_table_id = var.subnet_route_table_id
}

resource "azurerm_subnet_route_table_association" "user_func_uat" {
  count = var.subnet_route_table_id == null ? 0 : 1

  subnet_id      = azurerm_subnet.func_user_uat[0].id
  route_table_id = var.subnet_route_table_id
}
