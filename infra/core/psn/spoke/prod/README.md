# IT-Wallet - PSN Spoke - PROD

This directory contains the Terraform code to deploy changes to the PSN Spoke infrastructure.

> [!Note]
> Most of the resources have been deployed by PSN itself on behalf of IT-Wallet project and then imported here, so it was not possible to adhere to PagoPA naming conventions.

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
  - \*azurecontainerapps.io (port 80)
- Hashicorp:
  - \*terraform.io
  - \*hashicorp.com
- NPM
  - \*.npmjs.org

> [!Warning]
> Any application in the Spoke that needs to access internet services must have an exception rule on the firewall `pagopa-pa-azfwpolicy-italynorth`. Set the resource subnet CIDR as source and the required destination FQDNs.

### Spoke Virtual Network and Hub peering

A policy enforces the association of a route table to any subnet created in this VNet. The route table is `pagopa-Prod-ITWallet-spoke-routetable`, which forces traffic to the Firewall in Hub for any destination. This might be the reason for connectivity issues for resources deployed in this VNet.

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

> [!Warning]
> The `Owner` role can be obtained for a limited time via PIM and only for the resource groups listed here:
> - `wallet`
> - `terraform`
> - `monitoring`
> The `Owner` role is useful for role assignments and applying privileged changes. Therefore, privileged actions such as role assignments on other resource groups might be require PSN support (via email).

### Storage Account for Terraform backends

The Storage Account used for Terraform backends is shared with the Hub environment because of a lack of permissions on the Hub subscriptions.

Moreover, the Storage Account can be accessed only via private connections and with the required IAM roles (`Storage Blob Data Contributor`). The role is already assigned to the Entra ID group with PagoPA personnel.

