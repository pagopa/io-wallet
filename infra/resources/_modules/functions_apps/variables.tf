variable "project" {
  type        = string
  description = "IO prefix and short environment"
}

variable "project_legacy" {
  type        = string
  description = "IO prefix and short environment for legacy resources"
}

variable "location" {
  type        = string
  description = "Azure region"
}

variable "tags" {
  type        = map(any)
  description = "Resource tags"
}

variable "resource_group_name" {
  type        = string
  description = "Name of the resource group where resources will be created"
}

variable "subnet_id" {
  type        = string
  description = "Id of the subnet to use for Function Apps"
}

variable "subnet_private_endpoints_id" {
  type        = string
  description = "Id of the subnet which holds private endpoints"
}

variable "cosmos_db" {
  type = object({
    name        = string
    endpoint    = string
  })

  description = "Cosmos Account name and endpoint that Function Apps must use"
}
