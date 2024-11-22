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

resource "azurerm_private_endpoint" "sql_02" {
  name                = "${var.project}-wallet-sql-pep-02"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id

  private_service_connection {
    name                           = "${var.project}-wallet-sql-pep-02"
    private_connection_resource_id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-itn-wallet-rg-01/providers/Microsoft.DocumentDB/databaseAccounts/io-p-itn-wallet-cosno-02"
    is_manual_connection           = false
    subresource_names              = ["Sql"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [var.private_link_documents_id]
  }

  tags = var.tags
}
