locals {
  environment = {
    prefix          = var.prefix
    env_short       = var.env_short
    location        = var.location
    domain          = var.domain
    app_name        = var.app_name
    instance_number = var.instance_number
  }

  u_environment = merge(
    local.environment,
    {
      env_short = var.u_env_short
  })
}
