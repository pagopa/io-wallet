locals {
  function_app_wallet = {
    app_settings = merge({
      FUNCTIONS_WORKER_RUNTIME       = "node"
      FUNCTIONS_WORKER_PROCESS_COUNT = 4
      NODE_ENV                       = "production"

      // Keepalive fields are all optionals
      FETCH_KEEPALIVE_ENABLED             = "true"
      FETCH_KEEPALIVE_SOCKET_ACTIVE_TTL   = "110000"
      FETCH_KEEPALIVE_MAX_SOCKETS         = "40"
      FETCH_KEEPALIVE_MAX_FREE_SOCKETS    = "10"
      FETCH_KEEPALIVE_FREE_SOCKET_TIMEOUT = "30000"
      FETCH_KEEPALIVE_TIMEOUT             = "60000"

      CosmosDbEndpoint     = var.cosmos_db_endpoint
      CosmosDbDatabaseName = var.cosmos_database_names[0]

      EntityConfigurationStorageAccount__serviceUri = "https://${var.storage_account_cdn_name}.blob.core.windows.net"
      EntityConfigurationStorageContainerName       = "test"

      FederationEntityBasePath         = "https://wallet.io.pagopa.it"
      FederationEntityOrganizationName = "PagoPa S.p.A."
      FederationEntityHomepageUri      = "https://io.italia.it"
      FederationEntityPolicyUri        = "https://io.italia.it/privacy-policy/"
      FederationEntityTosUri           = "https://io.italia.it/privacy-policy/"
      FederationEntityLogoUri          = "https://io.italia.it/assets/img/io-it-logo-blue.svg"
      FederationEntityTrustAnchorUri   = "https://demo.federation.eudi.wallet.developers.italia.it"
      IosBundleIdentifier              = "it.pagopa.app.io"
      IosTeamIdentifier                = "M2X5YQ4BJ7"
      AndroidBundleIdentifier          = "it.pagopa.app.io"
      AndroidCrlUrl                    = "https://android.googleapis.com/attestation/status"
      AndroidPlayIntegrityUrl          = "https://www.googleapis.com/auth/playintegrity"
      AndroidPlayStoreCertificateHash  = "feT-Pqrgg__NiwcDAehlAtPx6tHdZqwUK618VEdVT4I"
      AppleRootCertificate             = "-----BEGIN CERTIFICATE-----\nMIICITCCAaegAwIBAgIQC/O+DvHN0uD7jG5yH2IXmDAKBggqhkjOPQQDAzBSMSYwJAYDVQQDDB1BcHBsZSBBcHAgQXR0ZXN0YXRpb24gUm9vdCBDQTETMBEGA1UECgwKQXBwbGUgSW5jLjETMBEGA1UECAwKQ2FsaWZvcm5pYTAeFw0yMDAzMTgxODMyNTNaFw00NTAzMTUwMDAwMDBaMFIxJjAkBgNVBAMMHUFwcGxlIEFwcCBBdHRlc3RhdGlvbiBSb290IENBMRMwEQYDVQQKDApBcHBsZSBJbmMuMRMwEQYDVQQIDApDYWxpZm9ybmlhMHYwEAYHKoZIzj0CAQYFK4EEACIDYgAERTHhmLW07ATaFQIEVwTtT4dyctdhNbJhFs/Ii2FdCgAHGbpphY3+d8qjuDngIN3WVhQUBHAoMeQ/cLiP1sOUtgjqK9auYen1mMEvRq9Sk3Jm5X8U62H+xTD3FE9TgS41o0IwQDAPBgNVHRMBAf8EBTADAQH/MB0GA1UdDgQWBBSskRBTM72+aEH/pwyp5frq5eWKoTAOBgNVHQ8BAf8EBAMCAQYwCgYIKoZIzj0EAwMDaAAwZQIwQgFGnByvsiVbpTKwSga0kP0e8EeDS4+sQmTvb7vn53O5+FRXgeLhpJ06ysC5PrOyAjEAp5U4xDgEgllF7En3VcE3iexZZtKeYnpqtijVoyFraWVIyd/dganmrduC1bmTBGwD\n-----END CERTIFICATE-----"
      GooglePublicKey                  = "-----BEGIN PUBLIC KEY-----\nMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAr7bHgiuxpwHsK7Qui8xU\nFmOr75gvMsd/dTEDDJdSSxtf6An7xyqpRR90PL2abxM1dEqlXnf2tqw1Ne4Xwl5j\nlRfdnJLmN0pTy/4lj4/7tv0Sk3iiKkypnEUtR6WfMgH0QZfKHM1+di+y9TFRtv6y\n//0rb+T+W8a9nsNL/ggjnar86461qO0rOs2cXjp3kOG1FEJ5MVmFmBGtnrKpa73X\npXyTqRxB/M0n1n/W9nGqC4FSYa04T6N5RIZGBN2z2MT5IKGbFlbC8UrW0DxW7AYI\nmQQcHtGl/m00QLVWutHQoVJYnFPlXTcHYvASLu+RhhsbDmxMgJJ0mcDpvsC4PjvB\n+TxywElgS70vE0XmLD+OJtvsBslHZvPBKCOdT0MS+tgSOIfga+z1Z1g7+DVagf7q\nuvmag8jfPioyKvxnK/EgsTUVi2ghzq8wm27ud/mIM7AY2qEORR8Go3TVB4HzWQgp\nZrt3i5MIlCaY504LzSRiigHCzAPlHws+W0rB5N+er5/2pJKnfBSDiCiFAVtCLOZ7\ngLiMm0jhO2B6tUXHI/+MRPjy02i59lINMRRev56GKtcd9qO/0kUJWdZTdA2XoS82\nixPvZtXQpUpuL12ab+9EaDK8Z4RHJYYfCT3Q5vNAXaiWQ+8PTWm2QgBR/bkwSWc+\nNpUFgNPN9PvQi8WEg5UmAGMCAwEAAQ==\n-----END PUBLIC KEY-----"
      AllowDevelopmentEnvironment      = "false"

      PdvTokenizerApiBaseURL = "https://api.uat.tokenizer.pdv.pagopa.it"
      PdvTokenizerTestUUID   = "c13b2aec-1597-4abd-a735-aacf2f935c93"
      },
      {
        for s in var.user_func.app_settings :
        s.name => s.key_vault_secret_name != null ? "@Microsoft.KeyVault(VaultName=${var.project}-wallet-kv-01;SecretName=${s.key_vault_secret_name})" : s.value
      }
    )
  }
}
