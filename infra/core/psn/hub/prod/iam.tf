resource "azurerm_user_assigned_identity" "appgateway" {
  provider = azurerm.hub

  name                = "pagopa-app-gw-id-01"
  resource_group_name = azurerm_resource_group.network.name
  location            = azurerm_resource_group.network.location

  tags = local.tags
}

data "azurerm_user_assigned_identity" "infra_github_cd" {
  name                = "iw-p-itn-infra-github-cd-id-01"
  resource_group_name = "iw-p-itn-github-identities-rg-01"
}

resource "azurerm_role_assignment" "infra_github_cd_private_dns_zone_contributor" {
  provider = azurerm.hub

  scope                = azurerm_resource_group.network.id
  role_definition_name = "Private DNS Zone Contributor"
  principal_id         = data.azurerm_user_assigned_identity.infra_github_cd.principal_id
  description          = "Allow IT Wallet infra GitHub CD identity to join Private Endpoints to hub Private DNS Zones"
}
