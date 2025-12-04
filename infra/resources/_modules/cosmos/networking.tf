locals {
  pep_name = var.psn_service_principal_id == null ? provider::dx::resource_name(merge(
    var.environment,
    {
      resource_type = "cosmos_private_endpoint"
    }
  )) : "io-p-itn-wallet-sql-pep-02" # temporary workaround until the resource will be deleted
}

resource "azurerm_private_endpoint" "sql" {
  name                = local.pep_name
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id

  private_service_connection {
    name                           = local.pep_name
    private_connection_resource_id = azurerm_cosmosdb_account.apps.id
    is_manual_connection           = false
    subresource_names              = ["Sql"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [var.private_link_documents_id]
  }

  tags = var.tags
}
