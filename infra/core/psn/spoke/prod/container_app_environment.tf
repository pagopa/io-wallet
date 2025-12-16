locals {
  cae_name = provider::dx::resource_name(merge(local.environment, {
    name          = "github-runner"
    resource_type = "container_app_environment",
  }))

  cae_infra_rg_name = "ME_${local.cae_name}_${azurerm_resource_group.gh_runner.name}_${local.environment.location}"
}

resource "azurerm_container_app_environment" "cae" {
  name                = local.cae_name
  location            = local.environment.location
  resource_group_name = azurerm_resource_group.gh_runner.name

  identity {
    type         = "SystemAssigned"
    identity_ids = []
  }

  workload_profile {
    maximum_count         = 0
    minimum_count         = 0
    name                  = "Consumption"
    workload_profile_type = "Consumption"
  }

  log_analytics_workspace_id = azurerm_log_analytics_workspace.this.id

  infrastructure_resource_group_name = local.cae_infra_rg_name

  infrastructure_subnet_id       = azurerm_subnet.cae_snet.id
  logs_destination               = "log-analytics"
  public_network_access          = "Disabled"
  internal_load_balancer_enabled = true

  tags = local.tags
}


# Container App Job for Self-Hosted GitHub Runners
resource "azurerm_container_app_job" "github_runner" {
  container_app_environment_id = azurerm_container_app_environment.cae.id
  name = provider::dx::resource_name(merge(local.environment, {
    domain        = "io",
    name          = "wallet",
    resource_type = "container_app_job"
  }))
  location            = local.environment.location
  resource_group_name = azurerm_resource_group.gh_runner.name

  workload_profile_name = "Consumption"

  identity {
    type = "SystemAssigned"
  }

  replica_timeout_in_seconds = 1800
  replica_retry_limit        = 1

  event_trigger_config {
    parallelism              = 1
    replica_completion_count = 1

    scale {
      max_executions              = 30
      min_executions              = 0
      polling_interval_in_seconds = 30

      rules {
        name             = "github-runner-rule"
        custom_rule_type = "github-runner"

        # https://keda.sh/docs/2.17/scalers/github-runner/
        metadata = {
          owner                     = local.repository.owner
          runnerScope               = "repo"
          repos                     = local.repository.name
          targetWorkflowQueueLength = "1"
          github-runner             = "https://api.github.com"
          enableEtags               = "true"
          labels                    = "psn"
        }

        authentication {
          secret_name       = "github-runner-pat"
          trigger_parameter = "personalAccessToken"
        }
      }
    }
  }

  secret {
    key_vault_secret_id = "${data.azurerm_key_vault.infra.vault_uri}secrets/github-runner-pat"

    identity = "System"
    name     = "github-runner-pat"
  }

  template {
    container {
      cpu    = 1.5
      image  = "ghcr.io/pagopa/github-self-hosted-runner-azure:beta-tls-debugging"
      memory = "3Gi"
      name   = "github-runner"

      env {
        name  = "LABELS"
        value = "psn"
      }

      env {
        name  = "REGISTRATION_TOKEN_API_URL"
        value = "https://api.github.com/repos/${local.repository.owner}/${local.repository.name}/actions/runners/registration-token"
      }

      env {
        name  = "REPO_URL"
        value = "https://github.com/${local.repository.owner}/${local.repository.name}"
      }

      env {
        name        = "GITHUB_PAT"
        secret_name = "github-runner-pat"
      }
    }
  }

  tags = local.tags
}

resource "azurerm_role_assignment" "kv_gh_runner" {
  scope                = data.azurerm_key_vault.infra.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_container_app_job.github_runner.identity[0].principal_id
  description          = "Allow the Container App Job for GitHub Runner to read to secrets"
}
