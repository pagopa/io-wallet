module "storage_account_queue" {
  source = "github.com/pagopa/dx//infra/modules/azure_storage_account?ref=main"
  environment         = local.environment
  tier                = "l"
  resource_group_name = var.resource_group_name

  subnet_pep_id                        = var.subnet_pep_id
  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name

  subservices_enabled = {
    blob  = false
    file  = false
    queue = true
    table = false
  }

  action_group_id = var.action_group_id

  tags = var.tags
}
