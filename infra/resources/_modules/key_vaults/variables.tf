variable "environment" {
  type = object({
    prefix          = string
    environment     = string
    location        = string
    name            = string
    instance_number = string
  })
}

variable "tags" {
  type        = map(any)
  description = "Resource tags"
}

variable "resource_group_name" {
  type        = string
  description = "Name of the resource group where resources will be created"
}

variable "tenant_id" {
  type        = string
  description = "Azure tenant Id"
}

variable "private_endpoint" {
  type = object({
    subnet_pep_id             = string
    private_dns_zone_group_id = string
  })
  default     = null
  description = "Configuration for the Private Endpoint. If null, KeyVault will be publicly available on internet"
}
