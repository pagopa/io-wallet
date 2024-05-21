variable "project" {
  type        = string
  description = "IO prefix and short environment"
}

variable "location" {
  type        = string
  description = "Azure region"
}

variable "secondary_location" {
  type = string
}

variable "tags" {
  type        = map(any)
  description = "Resource tags"
}

variable "resource_group_name" {
  type        = string
  description = "Name of the resource group where resources will be created"
}

variable "key_vault" {
  type = object({
    id                 = string
    key_versionless_id = string
  })
}

variable "private_endpoint_subnet_id" {
  type = string
}

variable "private_link_documents_id" {
  type = string
}
