module "key_vault_certificate_cdn" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.3"

  principal_id    = var.cdn_principal_id
  subscription_id = var.subscription_id

  key_vault = [{
    name                = var.key_vault_certificates.name
    resource_group_name = var.key_vault_certificates.resource_group_name
    has_rbac_support    = false
    description         = "It is required so the CDN can get the certificates stored in the key vault"

    roles = {
      certificates = "reader"
      secrets      = "reader"
    }
  }]
}

module "key_vault_certificate_infra_ci" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.3"

  principal_id    = var.cicd_principal_ids.infra.ci
  subscription_id = var.subscription_id

  key_vault = [{
    name                = var.key_vault_certificates.name
    resource_group_name = var.key_vault_certificates.resource_group_name
    has_rbac_support    = false
    description         = "It is required so CI workflow can get the certificates stored in the key vault"

    roles = {
      certificates = "reader"
      secrets      = "reader"
    }
  }]
}
