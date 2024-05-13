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

variable "secondary_location" {
  type        = string
  description = "Secondary Azure region used for replication purposes"
}

variable "tags" {
  type        = map(any)
  description = "Resource tags"
}

variable "resource_group_name" {
  type        = string
  description = "Name of the resource group where resources will be created"
}

variable "private_endpoint_subnet_id" {
  type        = string
  description = "Id of the subnet which has private endpoints"
}
