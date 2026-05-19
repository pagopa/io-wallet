locals {
  identity_type = format("UserAssignedIdentity=${var.user_assigned_managed_identity_id}%s", var.psn_service_principal_id == null ? "" : "&FederatedClientId=${var.psn_service_principal_id}")

  wallet_cosmosdb_containers = [
    # Each document represents a wallet instance
    # The userId partition key is the user fiscal code
    {
      name               = "wallet-instances"
      partition_key_path = "/userId"
      autoscale_settings = {
        max_throughput = var.throughput.wallet_instances
      }
      default_ttl = null
    },
    {
      name               = "nonces"
      partition_key_path = "/id"
      autoscale_settings = {
        max_throughput = var.throughput.nonces
      }
      default_ttl = 300
    },
    {
      name               = "whitelisted-fiscal-codes"
      partition_key_path = "/id"
      autoscale_settings = {
        max_throughput = var.throughput.whitelisted_fiscal_codes
      }
      default_ttl = null
    },
    {
      name               = "certificates"
      partition_key_path = "/id"
      autoscale_settings = {
        max_throughput = var.throughput.certificates
      }
      default_ttl = null
    },
    {
      name               = "status-list-catalogs"
      partition_key_path = "/id"
      autoscale_settings = {
        max_throughput = var.throughput.status_list_catalogs
      }
      default_ttl = null
    },
    {
      name               = "status-list-pages"
      partition_key_path = "/statusListId"
      autoscale_settings = {
        max_throughput = var.throughput.status_list_pages
      }
      default_ttl = null
    },
    {
      name               = "status-list-routing"
      partition_key_path = "/id"
      autoscale_settings = {
        max_throughput = var.throughput.status_list_routing
      }
      default_ttl = null
    },
    {
      name               = "leases-revoke-wallet-instances"
      partition_key_path = "/id"
      autoscale_settings = {
        max_throughput = var.throughput.leases
      }
      default_ttl = null
    },
  ]

  wallet_cosmosdb_uat_containers = [
    {
      name               = "wallet-instances"
      partition_key_path = "/userId"
      autoscale_settings = {
        max_throughput = var.throughput.uat.wallet_instances
      }
      default_ttl = null
    },
    {
      name               = "nonces"
      partition_key_path = "/id"
      autoscale_settings = {
        max_throughput = var.throughput.uat.nonces
      }
      default_ttl = 300
    },
    {
      name               = "certificates"
      partition_key_path = "/id"
      autoscale_settings = {
        max_throughput = var.throughput.uat.certificates
      }
      default_ttl = null
    },
    {
      name               = "certificates-v-1.3"
      partition_key_path = "/id"
      autoscale_settings = {
        max_throughput = var.throughput.uat.certificates
      }
      default_ttl = null
    },
    {
      name               = "whitelisted-fiscal-codes"
      partition_key_path = "/id"
      autoscale_settings = {
        max_throughput = var.throughput.uat.whitelisted_fiscal_codes
      }
      default_ttl = null
    },
    {
      name               = "status-list-catalogs"
      partition_key_path = "/id"
      autoscale_settings = {
        max_throughput = var.throughput.uat.status_list_catalogs
      }
      default_ttl = null
    },
    {
      name               = "status-list-pages"
      partition_key_path = "/statusListId"
      autoscale_settings = {
        max_throughput = var.throughput.uat.status_list_pages
      }
      default_ttl = null
    },
    {
      name               = "status-list-routing"
      partition_key_path = "/id"
      autoscale_settings = {
        max_throughput = var.throughput.uat.status_list_routing
      }
      default_ttl = null
    },
    {
      name               = "leases-revoke-wallet-instances"
      partition_key_path = "/id"
      autoscale_settings = {
        max_throughput = var.throughput.uat.leases
      }
      default_ttl = null
    },
  ]
}
