locals {
  wallet_cosmosdb_containers = [
    # Each document represents a wallet instance
    # The id_holder partition key is the tokenized identifier fo the user
    {
      name               = "wallet-instances"
      partition_key_path = "/userId"
      autoscale_settings = {
        max_throughput = 2000
      },
    }
  ]
}
