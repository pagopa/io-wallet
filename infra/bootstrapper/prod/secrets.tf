# GitHub Environment Secrets for PSN
data "azurerm_subscription" "psn" {
  provider = azurerm.psn
}

data "azurerm_client_config" "psn" {
  provider = azurerm.psn
}

resource "azurerm_user_assigned_identity" "infra_psn_ci" {
  provider            = azurerm.psn
  name                = "iw-p-itn-infra-github-ci-id-01"
  resource_group_name = "iw-p-itn-github-identities-rg-01"
  location            = local.location

  tags = local.tags
}

resource "azurerm_user_assigned_identity" "app_psn_ci" {
  provider            = azurerm.psn
  name                = "iw-p-itn-app-github-ci-id-01"
  resource_group_name = "iw-p-itn-github-identities-rg-01"
  location            = local.location

  tags = local.tags
}

resource "azurerm_user_assigned_identity" "opex_psn_ci" {
  provider            = azurerm.psn
  name                = "iw-p-itn-opex-github-ci-id-01"
  resource_group_name = "iw-p-itn-github-identities-rg-01"
  location            = local.location

  tags = local.tags
}

resource "azurerm_user_assigned_identity" "infra_psn_cd" {
  provider            = azurerm.psn
  name                = "iw-p-itn-infra-github-cd-id-01"
  resource_group_name = "iw-p-itn-github-identities-rg-01"
  location            = local.location

  tags = local.tags
}

resource "azurerm_user_assigned_identity" "app_psn_cd" {
  provider            = azurerm.psn
  name                = "iw-p-itn-app-github-cd-id-01"
  resource_group_name = "iw-p-itn-github-identities-rg-01"
  location            = local.location

  tags = local.tags
}

resource "azurerm_user_assigned_identity" "opex_psn_cd" {
  provider            = azurerm.psn
  name                = "iw-p-itn-opex-github-cd-id-01"
  resource_group_name = "iw-p-itn-github-identities-rg-01"
  location            = local.location

  tags = local.tags
}

locals {
  psn_subscription_id = provider::azurerm::parse_resource_id(data.azurerm_subscription.psn.id).subscription_id
  psn_tenant_id       = data.azurerm_client_config.psn.tenant_id

  ids = {
    issuer                  = "https://token.actions.githubusercontent.com"
    audience                = ["api://AzureADTokenExchange"]
    federated_identity_name = "iw-environment-%s-psn-prod-%s"
    infra_environment_name  = "infra-psn-prod-%s"
    app_environment_name    = "app-psn-prod-%s"
    opex_environment_name   = "opex-psn-prod-%s"
  }

  infra_psn_ci = {
    secrets = {
      "ARM_CLIENT_ID"       = azurerm_user_assigned_identity.infra_psn_ci.client_id
      "ARM_SUBSCRIPTION_ID" = local.psn_subscription_id
      "ARM_TENANT_ID"       = local.psn_tenant_id
    }
  }

  infra_ci = {
    secrets = {
      "ARM_PSN_CLIENT_ID"       = azurerm_user_assigned_identity.infra_psn_ci.client_id
      "ARM_PSN_SUBSCRIPTION_ID" = local.psn_subscription_id
      "ARM_PSN_TENANT_ID"       = local.psn_tenant_id
    }
  }

  app_psn_ci = {
    secrets = {
      "ARM_CLIENT_ID"       = azurerm_user_assigned_identity.app_psn_ci.client_id
      "ARM_SUBSCRIPTION_ID" = local.psn_subscription_id
      "ARM_TENANT_ID"       = local.psn_tenant_id
    }
  }

  opex_psn_ci = {
    secrets = {
      "ARM_CLIENT_ID"       = azurerm_user_assigned_identity.opex_psn_ci.client_id
      "ARM_SUBSCRIPTION_ID" = local.psn_subscription_id
      "ARM_TENANT_ID"       = local.psn_tenant_id
    }
  }

  infra_psn_cd = {
    secrets = {
      "ARM_CLIENT_ID"       = azurerm_user_assigned_identity.infra_psn_cd.client_id
      "ARM_SUBSCRIPTION_ID" = local.psn_subscription_id
      "ARM_TENANT_ID"       = local.psn_tenant_id
    }
  }

  infra_cd = {
    secrets = {
      "ARM_PSN_CLIENT_ID"       = azurerm_user_assigned_identity.infra_psn_cd.client_id
      "ARM_PSN_SUBSCRIPTION_ID" = local.psn_subscription_id
      "ARM_PSN_TENANT_ID"       = local.psn_tenant_id
    }
  }

  app_psn_cd = {
    secrets = {
      "ARM_CLIENT_ID"       = azurerm_user_assigned_identity.app_psn_cd.client_id
      "ARM_SUBSCRIPTION_ID" = local.psn_subscription_id
      "ARM_TENANT_ID"       = local.psn_tenant_id
    }
  }

  opex_psn_cd = {
    secrets = {
      "ARM_CLIENT_ID"       = azurerm_user_assigned_identity.opex_psn_cd.client_id
      "ARM_SUBSCRIPTION_ID" = local.psn_subscription_id
      "ARM_TENANT_ID"       = local.psn_tenant_id
    }
  }
}

# CI
resource "github_actions_environment_secret" "app_psn_ci" {
  for_each = local.app_psn_ci.secrets

  repository      = local.repository.name
  environment     = "app-psn-prod-ci"
  secret_name     = each.key
  plaintext_value = each.value
}

resource "github_actions_environment_secret" "infra_psn_ci" {
  for_each = local.infra_psn_ci.secrets

  repository      = local.repository.name
  environment     = "infra-psn-prod-ci"
  secret_name     = each.key
  plaintext_value = each.value
}

resource "github_actions_environment_secret" "infra_ci" {
  for_each = local.infra_ci.secrets

  repository      = local.repository.name
  environment     = "infra-prod-ci"
  secret_name     = each.key
  plaintext_value = each.value
}

resource "github_actions_environment_secret" "opex_psn_ci" {
  for_each = local.opex_psn_ci.secrets

  repository      = local.repository.name
  environment     = "opex-psn-prod-ci"
  secret_name     = each.key
  plaintext_value = each.value
}

# CD
resource "github_actions_environment_secret" "infra_psn_cd" {
  for_each = local.infra_psn_cd.secrets

  repository      = local.repository.name
  environment     = "infra-psn-prod-cd"
  secret_name     = each.key
  plaintext_value = each.value
}

resource "github_actions_environment_secret" "infra_cd" {
  for_each = local.infra_cd.secrets

  repository      = local.repository.name
  environment     = "infra-prod-cd"
  secret_name     = each.key
  plaintext_value = each.value
}

resource "github_actions_environment_secret" "app_psn_cd" {
  for_each = local.app_psn_cd.secrets

  repository      = local.repository.name
  environment     = "app-psn-prod-cd"
  secret_name     = each.key
  plaintext_value = each.value
}

resource "github_actions_environment_secret" "opex_psn_cd" {
  for_each = local.opex_psn_cd.secrets

  repository      = local.repository.name
  environment     = "opex-psn-prod-cd"
  secret_name     = each.key
  plaintext_value = each.value
}

# Federated Identity
# CI
resource "azurerm_federated_identity_credential" "github_app_psn_ci" {
  provider            = azurerm.psn
  resource_group_name = azurerm_user_assigned_identity.app_psn_cd.resource_group_name
  name                = format(local.ids.federated_identity_name, "app", "cd")
  audience            = local.ids.audience
  issuer              = local.ids.issuer
  parent_id           = azurerm_user_assigned_identity.app_psn_cd.id
  subject             = "repo:pagopa/${local.repository.name}:environment:${format(local.ids.app_environment_name, "cd")}"
}

resource "azurerm_federated_identity_credential" "github_infra_psn_ci" {
  provider            = azurerm.psn
  resource_group_name = azurerm_user_assigned_identity.infra_psn_ci.resource_group_name
  name                = format(local.ids.federated_identity_name, "infra", "ci")
  audience            = local.ids.audience
  issuer              = local.ids.issuer
  parent_id           = azurerm_user_assigned_identity.infra_psn_ci.id
  subject             = "repo:pagopa/${local.repository.name}:environment:${format(local.ids.infra_environment_name, "ci")}"
}

resource "azurerm_federated_identity_credential" "github_infra_ci" {
  provider            = azurerm.psn
  resource_group_name = azurerm_user_assigned_identity.infra_psn_ci.resource_group_name
  name                = "iw-environment-infra-prod-ci"
  audience            = local.ids.audience
  issuer              = local.ids.issuer
  parent_id           = azurerm_user_assigned_identity.infra_psn_ci.id
  subject             = "repo:pagopa/${local.repository.name}:environment:infra-prod-ci"
}

resource "azurerm_federated_identity_credential" "github_opex_psn_ci" {
  provider            = azurerm.psn
  resource_group_name = azurerm_user_assigned_identity.opex_psn_ci.resource_group_name
  name                = format(local.ids.federated_identity_name, "opex", "ci")
  audience            = local.ids.audience
  issuer              = local.ids.issuer
  parent_id           = azurerm_user_assigned_identity.opex_psn_ci.id
  subject             = "repo:pagopa/${local.repository.name}:environment:${format(local.ids.opex_environment_name, "ci")}"
}

# CD

resource "azurerm_federated_identity_credential" "github_app_psn_cd" {
  provider            = azurerm.psn
  resource_group_name = azurerm_user_assigned_identity.app_psn_cd.resource_group_name
  name                = format(local.ids.federated_identity_name, "app", "cd")
  audience            = local.ids.audience
  issuer              = local.ids.issuer
  parent_id           = azurerm_user_assigned_identity.app_psn_cd.id
  subject             = "repo:pagopa/${local.repository.name}:environment:${format(local.ids.app_environment_name, "cd")}"
}

resource "azurerm_federated_identity_credential" "github_infra_psn_cd" {
  provider            = azurerm.psn
  resource_group_name = azurerm_user_assigned_identity.infra_psn_cd.resource_group_name
  name                = format(local.ids.federated_identity_name, "infra", "cd")
  audience            = local.ids.audience
  issuer              = local.ids.issuer
  parent_id           = azurerm_user_assigned_identity.infra_psn_cd.id
  subject             = "repo:pagopa/${local.repository.name}:environment:${format(local.ids.infra_environment_name, "cd")}"
}

resource "azurerm_federated_identity_credential" "github_infra_cd" {
  provider            = azurerm.psn
  resource_group_name = azurerm_user_assigned_identity.infra_psn_cd.resource_group_name
  name                = "iw-environment-infra-prod-cd"
  audience            = local.ids.audience
  issuer              = local.ids.issuer
  parent_id           = azurerm_user_assigned_identity.infra_psn_cd.id
  subject             = "repo:pagopa/${local.repository.name}:environment:infra-prod-cd"
}

resource "azurerm_federated_identity_credential" "github_opex_psn_cd" {
  provider            = azurerm.psn
  resource_group_name = azurerm_user_assigned_identity.opex_psn_cd.resource_group_name
  name                = format(local.ids.federated_identity_name, "opex", "cd")
  audience            = local.ids.audience
  issuer              = local.ids.issuer
  parent_id           = azurerm_user_assigned_identity.opex_psn_cd.id
  subject             = "repo:pagopa/${local.repository.name}:environment:${format(local.ids.opex_environment_name, "cd")}"
}

