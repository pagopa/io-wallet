resource "azurerm_private_endpoint" "sql" {
  name                = "${var.project}-wallet-sql-pep-01"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id

  private_service_connection {
    name                           = "${var.project}-wallet-sql-pep-01"
    private_connection_resource_id = azurerm_cosmosdb_account.wallet.id
    is_manual_connection           = false
    subresource_names              = ["Sql"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [var.private_link_documents_id]
  }

  tags = var.tags
}
