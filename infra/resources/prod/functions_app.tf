module "functions" {
  source = "../_modules/functions_apps"

  project             = local.project
  project_legacy      = local.project_legacy
  location            = local.location
  resource_group_name = module.resource_groups.resource_group_wallet.name

  subnet_id                   = module.networking.subnet_wallet.id
  subnet_private_endpoints_id = module.networking.subnet_pendpoints.id

  tags = local.tags

  cosmos_db = {
    endpoint    = module.cosmos.cosmos_account_wallet_endpoint
    primary_key = module.cosmos.cosmos_account_wallet_primary_key
  }
}

# Allow the Function App to access the Storage Account
# to write the signed entity configuration to the blob storage
resource "azurerm_role_assignment" "function_to_storage" {
  scope                 = module.cdn.storage_account.id
  # see https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles
  role_definition_name  = "Contributor"
  principal_id          = module.functions.function_app_wallet.id
}

# Allow the Function App to access the Key Vault
resource "azurerm_role_assignment" "function_to_keyvault" {
  scope                 = module.keyvault.id
  # see https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles
  role_definition_name  = "Reader"
  principal_id          = module.functions.function_app_wallet.id
}
