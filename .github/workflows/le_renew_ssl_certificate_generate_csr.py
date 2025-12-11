#!/usr/bin/env python3

import argparse
import logging
import textwrap
import sys
import cryptography.hazmat.primitives
import cryptography.x509


LOGGER = logging.getLogger(__name__)
LOGGER.addHandler(logging.StreamHandler())
LOGGER.setLevel(logging.INFO)


def get_csr(common_name, out, keyout, rsa_key_size):

    log = LOGGER

    # generate private_key, RSA type
    # TODO support ECDSA type of certificates
    log.info("Generating a RSA private key...")
    private_key = cryptography.hazmat.primitives.asymmetric.rsa.generate_private_key(
        public_exponent=65537,  # this is the RSA e exponent. DO NOT CHANGE THIS VALUE!
        key_size=rsa_key_size
    )

    # save private_key
    with open(keyout, "wb") as f:
        f.write(
            private_key.private_bytes(
                encoding=cryptography.hazmat.primitives.serialization.Encoding.PEM,
                format=cryptography.hazmat.primitives.serialization.PrivateFormat.PKCS8,
                encryption_algorithm=cryptography.hazmat.primitives.serialization.NoEncryption()
            )
        )
    log.info("Private key saved to %s", keyout)

    # CSR creation
    log.info("Building a Certificate Signing Request (CSR)...")
    builder = cryptography.x509.CertificateSigningRequestBuilder()
    # set Common Name
    builder = builder.subject_name(cryptography.x509.Name(
        [cryptography.x509.NameAttribute(
            cryptography.x509.oid.NameOID.COMMON_NAME, common_name)]
    ))
    # set Basic Constraints
    builder = builder.add_extension(cryptography.x509.BasicConstraints(
        ca=False, path_length=None), critical=True)
    # set Key Usage
    builder = builder.add_extension(cryptography.x509.KeyUsage(
        digital_signature=True, key_encipherment=True, content_commitment=False,
        data_encipherment=False, key_agreement=False, key_cert_sign=False, crl_sign=False,
        encipher_only=False, decipher_only=False),
        critical=True
    )
    # set Extended Key Usage
    builder = builder.add_extension(
        cryptography.x509.ExtendedKeyUsage(
            [cryptography.x509.oid.ExtendedKeyUsageOID.SERVER_AUTH]),
        critical=False
    )
    # set Common Name in SAN field too
    builder = builder.add_extension(
        cryptography.x509.SubjectAlternativeName(
            [cryptography.x509.DNSName(common_name)]),
        critical=False
    )
    # sign the CSR with private key
    csr = builder.sign(
        private_key, cryptography.hazmat.primitives.hashes.SHA256())

    # save CSR to file
    with open(out, "wb") as f:
        f.write(
            csr.public_bytes(
                encoding=cryptography.hazmat.primitives.serialization.Encoding.DER)
        )
    log.info("CSR saved to %s", out)


def main(argv=None):
    parser = argparse.ArgumentParser(
        formatter_class=argparse.RawDescriptionHelpFormatter,
        description=textwrap.dedent("""\
            This script generates a CSR in DER format.

            Example Usage:
            python3 generate_csr.py --common-name example.com --keyout csr.key --out csr.der --rsa-key-size 2048
            """)
    )
    parser.add_argument("--common-name", required=True,
                        help="X509 Common Name string")
    parser.add_argument("--quiet", action="store_const",
                        const=logging.ERROR, help="Suppress output except for errors")
    parser.add_argument("--rsa-key-size", default=2048, type=int,
                        choices=[2048, 3072, 4096], help="RSA key size in bits")
    parser.add_argument("--out", default="csr.der",
                        help="Destination of the CSR")
    parser.add_argument("--keyout", default="csr.key",
                        help="Destination of the CSR private key")

    args = parser.parse_args(argv)
    LOGGER.setLevel(args.quiet or LOGGER.level)
    # TODO add support for arbitrary SAN fields
    get_csr(args.common_name, args.out, args.keyout, args.rsa_key_size)


if __name__ == "__main__":
    main(sys.argv[1:])
