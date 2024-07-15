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
      EntityConfigurationStorageContainerName       = "well-known"

      FederationEntityBasePath         = "https://wallet.io.pagopa.it"
      FederationEntityOrganizationName = "PagoPa S.p.A."
      FederationEntityHomepageUri      = "https://io.italia.it"
      FederationEntityPolicyUri        = "https://io.italia.it/privacy-policy/"
      FederationEntityTosUri           = "https://io.italia.it/privacy-policy/"
      FederationEntityLogoUri          = "https://io.italia.it/assets/img/io-it-logo-blue.svg"
      IosBundleIdentifier              = "it.pagopa.app.io"
      IosTeamIdentifier                = "M2X5YQ4BJ7"
      AndroidBundleIdentifier          = "it.pagopa.io.app"
      AndroidCrlUrl                    = "https://android.googleapis.com/attestation/status"
      AndroidPlayIntegrityUrl          = "https://www.googleapis.com/auth/playintegrity"
      AndroidPlayStoreCertificateHash  = "feT-Pqrgg__NiwcDAehlAtPx6tHdZqwUK618VEdVT4I"
      AppleRootCertificate             = "-----BEGIN CERTIFICATE-----Ck1JSUNJVENDQWFlZ0F3SUJBZ0lRQy9PK0R2SE4wdUQ3akc1eUgySVhtREFLQmdncWhrak9QUVFEQXpCU01TWXdKQVlEVlFRRERCMUJjSEJzWlNCQmNIQWdRWFIwWlhOMFlYUnBiMjRnVW05dmRDQkRRVEVUTUJFR0ExVUVDZ3dLUVhCd2JHVWdTVzVqTGpFVE1CRUdBMVVFQ0F3S1EyRnNhV1p2Y201cFlUQWVGdzB5TURBek1UZ3hPRE15TlROYUZ3MDBOVEF6TVRVd01EQXdNREJhTUZJeEpqQWtCZ05WQkFNTUhVRndjR3hsSUVGd2NDQkJkSFJsYzNSaGRHbHZiaUJTYjI5MElFTkJNUk13RVFZRFZRUUtEQXBCY0hCc1pTQkpibU11TVJNd0VRWURWUVFJREFwRFlXeHBabTl5Ym1saE1IWXdFQVlIS29aSXpqMENBUVlGSzRFRUFDSURZZ0FFUlRIaG1MVzA3QVRhRlFJRVZ3VHRUNGR5Y3RkaE5iSmhGcy9JaTJGZENnQUhHYnBwaFkzK2Q4cWp1RG5nSU4zV1ZoUVVCSEFvTWVRL2NMaVAxc09VdGdqcUs5YXVZZW4xbU1FdlJxOVNrM0ptNVg4VTYySCt4VEQzRkU5VGdTNDFvMEl3UURBUEJnTlZIUk1CQWY4RUJUQURBUUgvTUIwR0ExVWREZ1FXQkJTc2tSQlRNNzIrYUVIL3B3eXA1ZnJxNWVXS29UQU9CZ05WSFE4QkFmOEVCQU1DQVFZd0NnWUlLb1pJemowRUF3TURhQUF3WlFJd1FnRkduQnl2c2lWYnBUS3dTZ2Ewa1AwZThFZURTNCtzUW1UdmI3dm41M081K0ZSWGdlTGhwSjA2eXNDNVByT3lBakVBcDVVNHhEZ0VnbGxGN0VuM1ZjRTNpZXhaWnRLZVlucHF0aWpWb3lGcmFXVkl5ZC9kZ2FubXJkdUMxYm1UQkd3RAo=-----END CERTIFICATE-----"
      GooglePublicKey                  = "-----BEGIN PUBLIC KEY-----Ck1JSUNJakFOQmdrcWhraUc5dzBCQVFFRkFBT0NBZzhBTUlJQ0NnS0NBZ0VBcjdiSGdpdXhwd0hzSzdRdWk4eFUKRm1Pcjc1Z3ZNc2QvZFRFRERKZFNTeHRmNkFuN3h5cXBSUjkwUEwyYWJ4TTFkRXFsWG5mMnRxdzFOZTRYd2w1agpsUmZkbkpMbU4wcFR5LzRsajQvN3R2MFNrM2lpS2t5cG5FVXRSNldmTWdIMFFaZktITTErZGkreTlURlJ0djZ5Ci8vMHJiK1QrVzhhOW5zTkwvZ2dqbmFyODY0NjFxTzByT3MyY1hqcDNrT0cxRkVKNU1WbUZtQkd0bnJLcGE3M1gKcFh5VHFSeEIvTTBuMW4vVzluR3FDNEZTWWEwNFQ2TjVSSVpHQk4yejJNVDVJS0diRmxiQzhVclcwRHhXN0FZSQptUVFjSHRHbC9tMDBRTFZXdXRIUW9WSlluRlBsWFRjSFl2QVNMdStSaGhzYkRteE1nSkowbWNEcHZzQzRQanZCCitUeHl3RWxnUzcwdkUwWG1MRCtPSnR2c0JzbEhadlBCS0NPZFQwTVMrdGdTT0lmZ2ErejFaMWc3K0RWYWdmN3EKdXZtYWc4amZQaW95S3Z4bksvRWdzVFVWaTJnaHpxOHdtMjd1ZC9tSU03QVkycUVPUlI4R28zVFZCNEh6V1FncApacnQzaTVNSWxDYVk1MDRMelNSaWlnSEN6QVBsSHdzK1cwckI1TitlcjUvMnBKS25mQlNEaUNpRkFWdENMT1o3CmdMaU1tMGpoTzJCNnRVWEhJLytNUlBqeTAyaTU5bElOTVJSZXY1NkdLdGNkOXFPLzBrVUpXZFpUZEEyWG9TODIKaXhQdlp0WFFwVXB1TDEyYWIrOUVhREs4WjRSSEpZWWZDVDNRNXZOQVhhaVdRKzhQVFdtMlFnQlIvYmt3U1djKwpOcFVGZ05QTjlQdlFpOFdFZzVVbUFHTUNBd0VBQVE9PQo=-----END PUBLIC KEY-----"
      AllowDevelopmentEnvironment      = "false"

      PdvTokenizerApiBaseURL = "https://api.uat.tokenizer.pdv.pagopa.it"
      PdvTokenizerTestUUID   = "c13b2aec-1597-4abd-a735-aacf2f935c93"

      HubSpidLoginJwtPubKey     = "-----BEGIN PUBLIC KEY-----Ck1JSUJJakFOQmdrcWhraUc5dzBCQVFFRkFBT0NBUThBTUlJQkNnS0NBUUVBNE12WkJjMUhYcWwxT3ZGWGZ0S3BoZFdaQmpUVnNHYVpnL2FEYWJrdkhPaXRJWmFkK01SV1dwUEsrdVhFZHY0TTdIYzVRWkVacDgraERIS1R2dE5JZFhMdG1qRUgrU1d3WGg3WmVNb1Fyai9UTjZlSTUwNkwzOWxHY0ZzU1pmbVRZckFacHBTUTMzOEloYlo3Y3VLSU9GN0FOMDlHOFV6djJFMUxnV0hkMytFM0ZXSWloSnJIRUJSaVBmOTBkWFVCOEM0dDJkQmROMW5teUdZYnZSd2xUaUdlM1pCaUMrRE1XWkIxWWRRTmFKcG9jdy9KKzBETzZwSUpiY1orR0hmZ21aVzhucTgrQWd0bTlhUWNPVGoxK2EyMnRwa01DNkM1TWlaMVBEbnN0d0J6ZnpKdjZ1ck5GTVMrcDV2VlFqQm0xMVBwamc5Q1d2V3FjbTlBSS9tYUF3SURBUUFCCg==-----END PUBLIC KEY-----",
      HubSpidLoginJwtIssuer     = "api-web.io.pagopa.it/ioweb/auth"
      HubSpidLoginClientBaseUrl = "https://io-p-weu-ioweb-spid-login.azurewebsites.net"

      TrialSystemApiBaseURL  = "https://api.trial.pagopa.it"
      TrialSystemTrialId     = "01J2GN4TA8FB6DPTAX3T3YD6M1"
      TrialSystemFeatureFlag = true
      },
      {
        for s in var.user_func.app_settings :
        s.name => s.key_vault_secret_name != null ? "@Microsoft.KeyVault(VaultName=${var.project}-wallet-kv-01;SecretName=${s.key_vault_secret_name})" : s.value
      }
    )
  }
}
