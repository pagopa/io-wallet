# IT-Wallet - PSN Spoke - PROD

This directory contains the Terraform code to deploy changes to the PSN Spoke infrastructure. Most of the resources have been deployed by PSN itself on behalf of IT-Wallet project and then imported here, so it was not possible to adhere to PagoPA naming conventions.

## Environment description

In a Hub and Spoke architecture, the Hub is the landing zone containing the central virtual network that acts as a common point of connectivity to other networks, the Spokes. The Spokes contain virtual networks that peer with the Hub and host the application resources.

For more information, see [Hub documentation](../../hub/prod/README.md).

## List of resources

- Container App Environment and Job for GitHub self-hosted runner
- Spoke Virtual Network and Hub peering
- Resource groups
- Storage Account for Terraform backends (currently shared with Hub)

### Container App Environment and Job

This is a traditional setup for hosting GitHub self-hosted runners in Azure Container Apps Jobs. It distinguishes the runner deployed in Spoke VNet from the one used in IO VNet by using the label [`psn`](./container_app_environment.tf#L79).

Setting up these resources required some configuration at firewall level in order to allow the Container App to reach external services. In particular, the Container App Environment subnet has been granted access to:

- GitHub services:
  - \*.trafficmanager.net
  - \*.sigstore.dev
  - \*.comodoca.com
  - \*.sectigo.com
  - \*.digicert.com
  - \*github.com
  - codeload.github.com
  - ghcr.io
  - github.com
  - api.github.com
  - \*.githubusercontent.com
- Azure services:
  - azurewatsonanalysis-prod.core.windows.net
  - \*.italynorth.azurecontainerapps.io
  - italynorth.ext.azurecontainerapps.dev
  - \*azure.com
  - \*.vault.azure.net
- Hashicorp:
  - \*terraform.io
  - \*hashicorp.com
- NPM
  - \*.npmjs.org

> **_WARNING:_** Any application in the Spoke that needs to access internet services must have an exception rule on the firewall `pagopa-pa-azfwpolicy-italynorth`. Set the resource subnet CIDR as source and the required destination FQDNs.

### Spoke Virtual Network and Hub peering

A policy enforces the association of a route table to any subnet created in this VNet. The route table is `pagopa-Prod-ITWallet-spoke-routetable`, which forces traffic to the Firewall in Hub for any destination. This might be reason of connectivity issues for resources deployed in this VNet.

Moreover, subnets cannot be created via Terraform as it creates the subnet before attaching the route table via the object `azurerm_subnet_route_table_association`. As a workaround, the subnet must be created manually and then imported into the Terraform state.
Currently, all the routes have been defined by PSN, except for `AllowP2SVPN` (to allow VPN connections) and `APIM`. The latter in particular needs to communicate with the internet during the deployment phase as it has several dependencies, and also requires firewall rules against Azure services via service tags:

- Storage
- Sql
- AzureKeyVault
- AzureMonitor
- AzureActiveDirectory
- ApiManagement

### Resource groups

The resource groups are organized as follows:

- `terraform`: contains the Storage Account for Terraform backend (shared with Hub)
- `monitoring`: contains Log Analytics workspace and Application Insights
- `networking`: contains VNet and peering with Hub
- `gh-runner`: contains Container App Environment and Job for GitHub self-hosted runner
- `wallet`: contains all application resources

> **_WARNING:_** The `Owner` role can be obtained only for the resource group `wallet` via PIM. Therefore, modifications on other resource groups might require PSN support.

### Storage Account for Terraform backends

The Storage Account used for Terraform backends is shared with the Hub environment because of a lack of permissions on the Hub subscriptions.

Moreover, the Storage Account can be accessed only via private connections and with the required IAM roles (`Storage Blob Data Contributor`). The role is already assigned to the Entra ID group with PagoPA personnel.

<!-- BEGIN_TF_DOCS -->

## Requirements

| Name                                                               | Version |
| ------------------------------------------------------------------ | ------- |
| <a name="requirement_azuread"></a> [azuread](#requirement_azuread) | ~> 2.0  |
| <a name="requirement_azurerm"></a> [azurerm](#requirement_azurerm) | ~> 4.0  |
| <a name="requirement_dx"></a> [dx](#requirement_dx)                | ~> 0.0  |

## Providers

| Name                                                                     | Version |
| ------------------------------------------------------------------------ | ------- |
| <a name="provider_azuread"></a> [azuread](#provider_azuread)             | 2.53.1  |
| <a name="provider_azurerm"></a> [azurerm](#provider_azurerm)             | 4.54.0  |
| <a name="provider_azurerm.hub"></a> [azurerm.hub](#provider_azurerm.hub) | 4.54.0  |

## Modules

No modules.

## Resources

| Name                                                                                                                                                                    | Type        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [azurerm_application_insights.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/application_insights)                               | resource    |
| [azurerm_container_app_environment.cae](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_app_environment)                      | resource    |
| [azurerm_container_app_job.github_runner](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_app_job)                            | resource    |
| [azurerm_log_analytics_workspace.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/log_analytics_workspace)                         | resource    |
| [azurerm_monitor_metric_alert.vnet_ddos](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert)                          | resource    |
| [azurerm_monitor_private_link_scope.wallet](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_private_link_scope)                 | resource    |
| [azurerm_monitor_private_link_scoped_service.appi](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_private_link_scoped_service) | resource    |
| [azurerm_monitor_private_link_scoped_service.log](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_private_link_scoped_service)  | resource    |
| [azurerm_private_endpoint.ampls](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint)                                      | resource    |
| [azurerm_private_endpoint.storage_terraform](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint)                          | resource    |
| [azurerm_resource_group.gh_runner](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group)                                      | resource    |
| [azurerm_resource_group.monitoring](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group)                                     | resource    |
| [azurerm_resource_group.networking](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group)                                     | resource    |
| [azurerm_resource_group.terraform](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group)                                      | resource    |
| [azurerm_resource_group.wallet](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group)                                         | resource    |
| [azurerm_role_assignment.itwallet_rg_terraform_blob_owner](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)             | resource    |
| [azurerm_role_assignment.kv_gh_runner](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)                                 | resource    |
| [azurerm_route_table.spoke](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/route_table)                                                | resource    |
| [azurerm_storage_account.terraform](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account)                                    | resource    |
| [azurerm_subnet.cae_snet](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet)                                                       | resource    |
| [azurerm_subnet.pep](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet)                                                            | resource    |
| [azurerm_subnet_route_table_association.cae_snet](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet_route_table_association)       | resource    |
| [azurerm_subnet_route_table_association.pep](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet_route_table_association)            | resource    |
| [azurerm_virtual_network.spoke](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network)                                        | resource    |
| [azurerm_virtual_network_peering.spoke_to_hub](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_peering)                 | resource    |
| [azuread_group.itwallet](https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/data-sources/group)                                                      | data source |
| [azurerm_key_vault.infra](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault)                                                 | data source |
| [azurerm_private_dns_zone.agentsvc](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone)                                | data source |
| [azurerm_private_dns_zone.blob](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone)                                    | data source |
| [azurerm_private_dns_zone.monitor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone)                                 | data source |
| [azurerm_private_dns_zone.ods](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone)                                     | data source |
| [azurerm_private_dns_zone.oms](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone)                                     | data source |

## Inputs

No inputs.

## Outputs

| Name                                                                                                           | Description |
| -------------------------------------------------------------------------------------------------------------- | ----------- |
| <a name="output_storage_account_terraform"></a> [storage_account_terraform](#output_storage_account_terraform) | n/a         |
| <a name="output_virtual_network"></a> [virtual_network](#output_virtual_network)                               | n/a         |

<!-- END_TF_DOCS -->
