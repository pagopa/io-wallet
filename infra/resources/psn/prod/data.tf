data "azurerm_client_config" "current" {}

data "azurerm_subscription" "current" {}

data "azuread_group" "wallet" {
  display_name = "pagopa-ITWallet"
}

data "azurerm_resource_group" "wallet" {
  name = provider::dx::resource_name(merge(
    local.environment,
    {
      name          = "wallet",
      resource_type = "resource_group"
    }
  ))
}

data "azurerm_virtual_network" "spoke" {
  name                = local.spoke.name
  resource_group_name = local.spoke.resource_group_name
}

data "azurerm_subnet" "pep" {
  name = provider::dx::resource_name(merge(local.environment, {
    domain        = ""
    name          = "pep"
    resource_type = "subnet"
  }))
  virtual_network_name = data.azurerm_virtual_network.spoke.name
  resource_group_name  = data.azurerm_virtual_network.spoke.resource_group_name
}

data "azurerm_private_dns_zone" "kv" {
  provider = azurerm.hub

  name                = "privatelink.vaultcore.azure.net"
  resource_group_name = local.hub.resource_group_name
}

data "azurerm_private_dns_zone" "blob" {
  provider = azurerm.hub

  name                = "privatelink.blob.core.windows.net"
  resource_group_name = local.hub.resource_group_name
}

data "azurerm_private_dns_zone" "queue" {
  provider = azurerm.hub

  name                = "privatelink.queue.core.windows.net"
  resource_group_name = local.hub.resource_group_name
}

data "azurerm_key_vault_secret" "notification_slack" {
  name         = "slack-wallet-channel-email"
  key_vault_id = module.key_vault_app.key_vault_wallet.id
}

data "azurerm_key_vault_secret" "notification_email" {
  name         = "email-wallet"
  key_vault_id = module.key_vault_app.key_vault_wallet.id
}
