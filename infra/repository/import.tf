import {
  id = "io-wallet:app-prod-cd"
  to = module.repo.github_repository_environment.app_prod_cd
}

# import {
#   id = "io-wallet:infra-prod-cd"
#   to = module.repo.github_repository_environment.infra_prod_cd
# }

# import {
#   id = "io-wallet:infra-prod-ci"
#   to = module.repo.github_repository_environment.infra_prod_ci
# }

import {
  id = "io-wallet:opex-prod-ci"
  to = module.repo.github_repository_environment.opex_prod_ci
}

import {
  id = "io-wallet:opex-prod-cd"
  to = module.repo.github_repository_environment.opex_prod_cd
}
