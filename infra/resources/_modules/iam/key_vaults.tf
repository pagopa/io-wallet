module "key_vault_certificate_cdn" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.3"

  principal_id    = var.cdn_principal_id
  subscription_id = var.subscription_id

  key_vault = [{
    name                = var.key_vault_certificates.name
    resource_group_name = var.key_vault_certificates.resource_group_name
    has_rbac_support    = var.is_psn
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
    has_rbac_support    = var.is_psn
    description         = "It is required so CI workflow can get the certificates stored in the key vault"

    roles = {
      certificates = "reader"
      secrets      = "reader"
    }
  }]
}

module "key_vault_certificate_infra_cd" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.3"

  principal_id    = var.cicd_principal_ids.infra.cd
  subscription_id = var.subscription_id

  key_vault = [{
    name                = var.key_vault_certificates.name
    resource_group_name = var.key_vault_certificates.resource_group_name
    has_rbac_support    = var.is_psn
    description         = "It is required so CD workflow can manage the certificates stored in the key vault"

    roles = {
      certificates = "reader"
      secrets      = "reader"
    }
  }]
}

module "key_vault_infra" {
  count = var.application_gateway_id != null ? 1 : 0

  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.3"

  principal_id    = var.application_gateway_id
  subscription_id = var.subscription_id

  key_vault = [
    {
      name                = var.key_vault_certificates.name
      resource_group_name = var.key_vault_certificates.resource_group_name
      has_rbac_support    = var.is_psn
      description         = "Allow Application Gateway to read certificates (via secrets) from Key Vault"
      roles = {
        secrets = "reader"
      }
    }
  ]
}

module "key_vault_apim" {
  count = var.is_psn ? 1 : 0

  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.3"

  principal_id    = var.apim_principal_id
  subscription_id = var.subscription_id

  key_vault = [
    {
      name = var.key_vault_app.name
      resource_group_name = var.key_vault_app.resource_group_name
      has_rbac_support = var.is_psn
      description = "Allow APIM to read secrets from Key Vault for named values"
      roles = {
        secrets = "reader"
      }
    }
  ]
}
