module "key_vault_role_assignments" {
  source = "github.com/pagopa-dx/terraform-azurerm-azure-role-assignments//modules/key_vault"

  principal_id = var.cdn_principal_id

  subscription_id = var.subscription_id

  key_vault = [{
    name                = var.key_vault_certificates.name
    resource_group_name = var.key_vault_certificates.resource_group_name
    description         = "It is required so the CDN can get the certificates stored in the key vault"

    roles = {
      certificates = "reader"
    }
  }]
}

resource "azurerm_key_vault_access_policy" "certificate_access" {
  key_vault_id = var.key_vault_certificates.id

  tenant_id = var.tenant_id
  object_id = var.ci_infra_principal_id

  certificate_permissions = [
    "Get"
  ]

  secret_permissions = [
    "Get"
  ]
}
