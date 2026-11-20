resource "azurerm_role_assignment" "infra_cd_apim_service_contributor" {
  count = 1

  scope                = data.azurerm_api_management.apim.id
  role_definition_name = "API Management Service Contributor"
  principal_id         = module.repo.identities.infra.cd.principal_id
  description          = "Allow ${local.repository.name} Infra CD identity to manage configuration at APIM scope"
}

resource "azurerm_role_assignment" "infra_ci_subscription_apim_secrets" {
  count = 1

  scope                = data.azurerm_api_management.apim.id
  role_definition_name = "PagoPA API Management Service List Secrets"
  principal_id         = module.repo.identities.infra.ci.principal_id
  description          = "Allow ${local.repository.name} Infra CI identity to read secrets at APIM scope"
}

resource "azurerm_role_assignment" "infra_cd_vnet_network_contributor" {
  scope                = data.azurerm_virtual_network.common.id
  role_definition_name = "Network Contributor"
  principal_id         = module.repo.identities.infra.cd.principal_id
  description          = "Allow ${local.repository.name} Infra CD identity to manage Private Endpoints at VNet scope"
}

resource "azurerm_role_assignment" "infra_cd_rg_nat_gw_network_contributor" {
  count = 1

  scope                = data.azurerm_resource_group.common_itn.id
  role_definition_name = "Network Contributor"
  principal_id         = module.repo.identities.infra.cd.principal_id
  description          = "Allow ${local.repository.name} Infra CD identity to associate NAT Gateways to subnets at resource group level"
}

resource "azurerm_key_vault_access_policy" "infra_cd_kv_common" {
  for_each = toset([data.azurerm_key_vault.common.id])

  key_vault_id = each.key
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = module.repo.identities.infra.cd.principal_id

  secret_permissions = ["Get", "List", "Set"]
}

resource "azurerm_key_vault_access_policy" "infra_ci_kv_common" {
  for_each = toset([data.azurerm_key_vault.common.id])

  key_vault_id = each.key
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = module.repo.identities.infra.ci.principal_id

  secret_permissions = ["Get", "List"]
}
