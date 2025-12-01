variable "environment" {
  type = object({
    prefix          = string
    environment     = string
    location        = string
    domain          = string
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
