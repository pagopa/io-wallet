# repository

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_github"></a> [github](#requirement\_github) | ~> 6.0 |

## Providers

| Name | Version |
|------|---------|
| <a name="provider_github"></a> [github](#provider\_github) | 6.11.1 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_github_repository"></a> [github\_repository](#module\_github\_repository) | pagopa-dx/github-environment-bootstrap/github | ~> 1.0 |

## Resources

| Name | Type |
|------|------|
| [github_actions_secret.slack_webhook_url](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/actions_secret) | resource |
| [github_repository_environment.automation_prod_cd](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/repository_environment) | resource |

## Inputs

No inputs.

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_repository_id"></a> [repository\_id](#output\_repository\_id) | The ID of the GitHub repository |
| <a name="output_repository_name"></a> [repository\_name](#output\_repository\_name) | The name of the GitHub repository |
<!-- END_TF_DOCS -->
