resource "github_repository_environment" "github_repository_environment_prod_cd" {
  environment = "prod-cd"
  repository  = github_repository.this.name

  deployment_branch_policy {
    protected_branches     = false
    custom_branch_policies = true
  }

  reviewers {
    teams = matchkeys(
      data.github_organization_teams.all.teams[*].id,
      data.github_organization_teams.all.teams[*].slug,
      local.cd.reviewers_teams
    )
  }
}

resource "github_repository_environment" "github_repository_environment_app_prod_cd" {
  environment = "app-prod-cd"
  repository  = github_repository.this.name

  deployment_branch_policy {
    protected_branches     = false
    custom_branch_policies = true
  }

  reviewers {
    teams = matchkeys(
      data.github_organization_teams.all.teams[*].id,
      data.github_organization_teams.all.teams[*].slug,
      local.cd_app.reviewers_teams
    )
  }
}

resource "github_actions_environment_secret" "env_prod_cd_secrets" {
  for_each = local.cd.secrets

  repository      = github_repository.this.name
  environment     = github_repository_environment.github_repository_environment_prod_cd.environment
  secret_name     = each.key
  plaintext_value = each.value
}

resource "github_actions_environment_secret" "env_app_prod_cd_secrets" {
  for_each = local.cd_app.secrets

  repository      = github_repository.this.name
  environment     = github_repository_environment.github_repository_environment_app_prod_cd.environment
  secret_name     = each.key
  plaintext_value = each.value
}
