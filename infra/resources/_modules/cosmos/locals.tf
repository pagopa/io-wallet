locals {

  resource_group_name_common        = "${var.project}-rg-common"
  resource_group_name_common_legacy = "${var.project_legacy}-rg-common"

  wallet_cosmosdb_containers = [
    # Each document represents a wallet instance
    # The id_holder partition key is the tokenized identifier fo the user
    {
      name               = "wallet-instance-records"
      partition_key_path = "/id_holder"
      autoscale_settings = {
        max_throughput = 2000
      },
    }
  ]
}
