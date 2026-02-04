variable "tags" {
  type        = map(any)
  description = "Resource tags"
}

variable "wallet_dns_zone_name" {
  type        = string
  description = "DNS zone name for wallet"
}

variable "wallet_dns_zone_resource_group_name" {
  type        = string
  description = "Resource group name for wallet DNS zone"
}
