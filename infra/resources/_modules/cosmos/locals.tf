locals {
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
