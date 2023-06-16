# The Azure Storage references that will keep the terraform state
# It's meant to be defined into the same subscription specified un backend.ini
resource_group_name  = ""
storage_account_name = ""
container_name       = "terraform-state"
key                  = "<YOUR_PROJECT_NAME>.terraform.tfstate"
