module "key_vault_domain" {
  source = "git::https://github.com/pagopa/terraform-azurerm-v3.git//key_vault?ref=v8.12.2"

  name                       = local.keyvault_name
  location                   = var.location
  resource_group_name        = var.resource_group_name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  soft_delete_retention_days = 90
  sku_name                   = "premium"

  tags = var.tags
}
