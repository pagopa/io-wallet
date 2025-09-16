import { createPublicKey, X509Certificate } from "crypto";
import { describe, expect, it } from "vitest";

import {
  decodeBase64String,
  GOOGLE_PUBLIC_KEY,
  HARDWARE_PUBLIC_TEST_KEY,
} from "@/app/config";
import {
  CRL,
  mergeCRL,
  validateIssuance,
  validateRevocation,
} from "@/certificates";

const revokedX509Chain = [
  "-----BEGIN CERTIFICATE-----\nMIICLDCCAbKgAwIBAgIKCXAxRHdzOYI5BjAKBggqhkjOPQQDAjAbMRkwFwYDVQQF\nExA4N2Y0NTE0NDc1YmEwYTJiMB4XDTE2MDUyNjE3MjAxNVoXDTI2MDUyNDE3MjAx\nNVowGzEZMBcGA1UEBRMQYjQxMDMwMWU1MWU0N2NmYjBZMBMGByqGSM49AgEGCCqG\nSM49AwEHA0IABA4z026cOo4gtJWwmMHC35v3tlvkl/WK6CdzM1/GeDVJVg5tw9Yi\nLfZMZ1pNa5hMNhiCjJTo/gDSimYQ0l8aqQGjgd0wgdowHQYDVR0OBBYEFDW8sdJy\ntohf7ksdrcYtMQmKmu4eMB8GA1UdIwQYMBaAFDBEI+Wi9gbhUKt3XxYWu5HMY8ZZ\nMAwGA1UdEwEB/wQCMAAwDgYDVR0PAQH/BAQDAgeAMCQGA1UdHgQdMBugGTAXghVp\nbnZhbGlkO2VtYWlsOmludmFsaWQwVAYDVR0fBE0wSzBJoEegRYZDaHR0cHM6Ly9h\nbmRyb2lkLmdvb2dsZWFwaXMuY29tL2F0dGVzdGF0aW9uL2NybC8wOTcwMzE0NDc3\nNzMzOTgyMzkwNjAKBggqhkjOPQQDAgNoADBlAjEA/KjXz483n538K3zxx+GPfXJo\n8RTKNcqMAJu1joME/eux0IZ8BVtGPj+r1P6NwWtHAjAf/IkoTdgJ/N1uqjFIN/N6\nVHVXEEBZ3T6LaEnzv2jWuvSag13qGyJ2K2RYyCFCjnk=\n-----END CERTIFICATE-----\n",
  "-----BEGIN CERTIFICATE-----\nMIIDwzCCAaugAwIBAgIKA4gmZ2BliZaFdTANBgkqhkiG9w0BAQsFADAbMRkwFwYD\nVQQFExBmOTIwMDllODUzYjZiMDQ1MB4XDTE2MDUyNjE3MDE1MVoXDTI2MDUyNDE3\nMDE1MVowGzEZMBcGA1UEBRMQODdmNDUxNDQ3NWJhMGEyYjB2MBAGByqGSM49AgEG\nBSuBBAAiA2IABGQ7VmgdJ/rEgs9sIE3rzvApXDUMAaqMMn8+1fRJrvQpZkJfOT2E\ndjtdrVaxDQRZxixqT5MlVqiSk8PRTqLx3+8OPLoicqMiOeGytH2sVQurvFynVeKq\nSGKK1jx2/2fccqOBtjCBszAdBgNVHQ4EFgQUMEQj5aL2BuFQq3dfFha7kcxjxlkw\nHwYDVR0jBBgwFoAUNmHhAHyIBQlRi0RsR/8aTMnqTxIwDwYDVR0TAQH/BAUwAwEB\n/zAOBgNVHQ8BAf8EBAMCAYYwUAYDVR0fBEkwRzBFoEOgQYY/aHR0cHM6Ly9hbmRy\nb2lkLmdvb2dsZWFwaXMuY29tL2F0dGVzdGF0aW9uL2NybC9FOEZBMTk2MzE0RDJG\nQTE4MA0GCSqGSIb3DQEBCwUAA4ICAQBAOYqLNryTmbOlnrjnIvDoXxzaLOgCXu29\nl7KpbFHacVLxgYuGRiIEQqzZBqUYSt9Pgx+P2KvoHtz99sEZr2xTe0Dw6CTHTAmx\nWXUFdrlvEMm2GySfvJRfMNCuX1oIS/M5PfREY2YZHyLq/sn1sJr3FjbKMdUMBo5A\ncamcD3H8wl9O/6qfhX+57iXzoK6yMzJRG/Mlkm58/sFk0pjayUBchmUJL0FQ6IhK\nYgy8RKE2UDyXKOE7+ZMSMUUkAdzyn2PFv7TvQtDk0ge2mkVrNrfPSglMzBNvrSDH\nPBmTktXzwseVagIRT5WI91OrUOYPFgostsfH42hs5wJtAFGPwDg/1mNa8UyH9k1b\nMrRq3Srez1XG0Ju7SGN/uNX5dkcwvfAmadtmM7Pp+l2VHRYRR600jAcM2+7bl8eg\nqfM/A7vyDLZqPIxDwkLXj2eN99nJZJVaGfB9dHyFOqBqBM6SdyV6MSIr3AHoo6u+\nBWIX9+q8n1qg5I6JWeEe+K58SbRDVoNQgsKP9/iPruXMU5rm2ywPxICVGysl1GgA\nP+FJ3X6oP0tXFWQlYoWdSloSVHNZQqj2ev/69sMnGsTeJw1V7I0gR+eZNEfxe+vZ\nD4KP88KxuiPCe94rp+Aqs5/YwuCo6rQ+HGi5OZNBsQXYIufClSBje+OpjQb7HJgi\nhJdzo2/IBw==\n-----END CERTIFICATE-----\n",
  "-----BEGIN CERTIFICATE-----\nMIIFYDCCA0igAwIBAgIJAOj6GWMU0voYMA0GCSqGSIb3DQEBCwUAMBsxGTAXBgNV\nBAUTEGY5MjAwOWU4NTNiNmIwNDUwHhcNMTYwNTI2MTYyODUyWhcNMjYwNTI0MTYy\nODUyWjAbMRkwFwYDVQQFExBmOTIwMDllODUzYjZiMDQ1MIICIjANBgkqhkiG9w0B\nAQEFAAOCAg8AMIICCgKCAgEAr7bHgiuxpwHsK7Qui8xUFmOr75gvMsd/dTEDDJdS\nSxtf6An7xyqpRR90PL2abxM1dEqlXnf2tqw1Ne4Xwl5jlRfdnJLmN0pTy/4lj4/7\ntv0Sk3iiKkypnEUtR6WfMgH0QZfKHM1+di+y9TFRtv6y//0rb+T+W8a9nsNL/ggj\nnar86461qO0rOs2cXjp3kOG1FEJ5MVmFmBGtnrKpa73XpXyTqRxB/M0n1n/W9nGq\nC4FSYa04T6N5RIZGBN2z2MT5IKGbFlbC8UrW0DxW7AYImQQcHtGl/m00QLVWutHQ\noVJYnFPlXTcHYvASLu+RhhsbDmxMgJJ0mcDpvsC4PjvB+TxywElgS70vE0XmLD+O\nJtvsBslHZvPBKCOdT0MS+tgSOIfga+z1Z1g7+DVagf7quvmag8jfPioyKvxnK/Eg\nsTUVi2ghzq8wm27ud/mIM7AY2qEORR8Go3TVB4HzWQgpZrt3i5MIlCaY504LzSRi\nigHCzAPlHws+W0rB5N+er5/2pJKnfBSDiCiFAVtCLOZ7gLiMm0jhO2B6tUXHI/+M\nRPjy02i59lINMRRev56GKtcd9qO/0kUJWdZTdA2XoS82ixPvZtXQpUpuL12ab+9E\naDK8Z4RHJYYfCT3Q5vNAXaiWQ+8PTWm2QgBR/bkwSWc+NpUFgNPN9PvQi8WEg5Um\nAGMCAwEAAaOBpjCBozAdBgNVHQ4EFgQUNmHhAHyIBQlRi0RsR/8aTMnqTxIwHwYD\nVR0jBBgwFoAUNmHhAHyIBQlRi0RsR/8aTMnqTxIwDwYDVR0TAQH/BAUwAwEB/zAO\nBgNVHQ8BAf8EBAMCAYYwQAYDVR0fBDkwNzA1oDOgMYYvaHR0cHM6Ly9hbmRyb2lk\nLmdvb2dsZWFwaXMuY29tL2F0dGVzdGF0aW9uL2NybC8wDQYJKoZIhvcNAQELBQAD\nggIBACDIw41L3KlXG0aMiS//cqrG+EShHUGo8HNsw30W1kJtjn6UBwRM6jnmiwfB\nPb8VA91chb2vssAtX2zbTvqBJ9+LBPGCdw/E53Rbf86qhxKaiAHOjpvAy5Y3m00m\nqC0w/Zwvju1twb4vhLaJ5NkUJYsUS7rmJKHHBnETLi8GFqiEsqTWpG/6ibYCv7rY\nDBJDcR9W62BW9jfIoBQcxUCUJouMPH25lLNcDc1ssqvC2v7iUgI9LeoM1sNovqPm\nQUiG9rHli1vXxzCyaMTjwftkJLkf6724DFhuKug2jITV0QkXvaJWF4nUaHOTNA4u\nJU9WDvZLI1j83A+/xnAJUucIv/zGJ1AMH2boHqF8CY16LpsYgBt6tKxxWH00XcyD\nCdW2KlBCeqbQPcsFmWyWugxdcekhYsAWyoSf818NUsZdBWBaR/OukXrNLfkQ79Iy\nZohZbvabO/X+MVT3rriAoKc8oE2Uws6DF+60PV7/WIPjNvXySdqspImSN78mflxD\nqwLqRBYkA3I75qppLGG9rp7UCdRjxMl8ZDBld+7yvHVgt1cVzJx9xnyGCC23Uaic\nMDSXYrB4I4WHXPGjxhZuCuPBLTdOLU8YRvMYdEvYebWHMpvwGCF6bAx3JBpIeOQ1\nwDB5y0USicV3YgYGmi+NZfhA4URSh77Yd6uuJOJENRaNVTzk\n-----END CERTIFICATE-----\n",
];

const validX509Chain = [
  "-----BEGIN CERTIFICATE-----\nMIICMTCCAbegAwIBAgIKFpJ0mJaXh5BUCTAKBggqhkjOPQQDAjAvMRkwFwYDVQQF\nExA1YmE4ODMwOTc0ZjI1ZWNiMRIwEAYDVQQMDAlTdHJvbmdCb3gwHhcNMjIwNTI1\nMjA0ODQyWhcNMzIwNTIyMjA0ODQyWjAvMRkwFwYDVQQFExA2MzkyODVhZGM5MWVm\nZDgxMRIwEAYDVQQMDAlTdHJvbmdCb3gwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNC\nAARbF5FoP+ZBqI3h77riu4/oTjHifMDD5NSUGIUt0nUqF8fKziSltIg0c44Rh43G\n5bvAo6+8buZL3jCQRJ6Jfv74o4G6MIG3MB0GA1UdDgQWBBSUXyRZOpw9cqMcjRep\nh2lvXJ+pUDAfBgNVHSMEGDAWgBRR0OQJyewFWOHjN6znnCP/dI5sazAPBgNVHRMB\nAf8EBTADAQH/MA4GA1UdDwEB/wQEAwICBDBUBgNVHR8ETTBLMEmgR6BFhkNodHRw\nczovL2FuZHJvaWQuZ29vZ2xlYXBpcy5jb20vYXR0ZXN0YXRpb24vY3JsLzE2OTI3\nNDk4OTY5Nzg3OTA1NDA5MAoGCCqGSM49BAMCA2gAMGUCMGflI8ZG6ng3FJulkFsR\nOOCZ6ZMaO0n31SqsXQEQo61fWnxD54Oz/TsP8m7Ym3WA6QIxAJjR4NJIbTda7MzJ\n8ByEqVb1GbENin4Nh+cwsJbvxe6JD1mIDhvLvbjMgQYsU6fOOQ==\n-----END CERTIFICATE-----\n",
  "-----BEGIN CERTIFICATE-----\nMIID1zCCAb+gAwIBAgIKA4gmZ2BliZaGEDANBgkqhkiG9w0BAQsFADAbMRkwFwYD\nVQQFExBmOTIwMDllODUzYjZiMDQ1MB4XDTIyMDUyNTIwMzYzOFoXDTMyMDUyMjIw\nMzYzOFowLzEZMBcGA1UEBRMQNWJhODgzMDk3NGYyNWVjYjESMBAGA1UEDAwJU3Ry\nb25nQm94MHYwEAYHKoZIzj0CAQYFK4EEACIDYgAEEsealjrEYkY/ngNBAsIwXrrL\nYjHEzYFvT9dU8aFvZWzOG4xa3uQJWPcFPY1HoYpI+KzBm4YzUbt4zYeGNjoov1E8\nwHA2wg/S4rmITsFAu8X62UltptbREuOGP6p8/Vb4o4G2MIGzMB0GA1UdDgQWBBRR\n0OQJyewFWOHjN6znnCP/dI5sazAfBgNVHSMEGDAWgBQ2YeEAfIgFCVGLRGxH/xpM\nyepPEjAPBgNVHRMBAf8EBTADAQH/MA4GA1UdDwEB/wQEAwICBDBQBgNVHR8ESTBH\nMEWgQ6BBhj9odHRwczovL2FuZHJvaWQuZ29vZ2xlYXBpcy5jb20vYXR0ZXN0YXRp\nb24vY3JsL0YxQzE3MkE2OTlFQUY1MUQwDQYJKoZIhvcNAQELBQADggIBAHrprDsA\nXE9VuxyMFjM+r+veMplhocS09y/rTgm9/SYnaQuvfan61dmP02VEVDG2+Ku0KRd/\nIdlbByRaxlD1an6vsCnUMbR0gG+ndEc7eE0V5TMjDkP4tEUbTwauvzbmTN2HsFnm\nBfa+Bd9vhzfjs3nryZDFc1n9ijmIpX/mzBAnRuBRyg6M69BxJ4zOMdxInHdu1MLf\nmRg702lJy5skTjpmMervRMHuj3AwFmuP4D8ZEiXejn/NDQWKRd+gTZwTMrj/KHbL\ncKwNOvxaVNSTxdL4J4qzaG/HCKKw8tsxk5QfAfGFE2t32dlxWdWgA1xXUInpUtOW\ny6IkpbhldSw4m22kZVMSKr8ba4U2Nj7bAeb1ypiOEU7DI/CEiynd9cOdYS8GG2LQ\nnvNCU25HsaBV0ShaAUumvriDgN5UEZVnZ4HyhSXjfwWpfCrBq46hzq0NPHFBNVRk\nBpqN5QDZJpNKCUJxOp/wWqFe518hb4B1cwXdZ2O4Dv3vIiHyEv2xUsQsskB22yti\nr4t1RXKAnazCwcsY3FY9LK3Rl9iNcJSmbMcFstDxg0LK6OgDHlHNCaP5GWyaS9E2\nRnT8j6GwxIU13eG0iDHzZZyqVt7t0FYJ5aLSv+TagMoKn4sh+VGbO+4d7DtkQoQH\nCkJnWlr76YQeHycV6GgUF/nR1stcobsyb3hY\n-----END CERTIFICATE-----\n",
  "-----BEGIN CERTIFICATE-----\nMIIFHDCCAwSgAwIBAgIJAPHBcqaZ6vUdMA0GCSqGSIb3DQEBCwUAMBsxGTAXBgNV\nBAUTEGY5MjAwOWU4NTNiNmIwNDUwHhcNMjIwMzIwMTgwNzQ4WhcNNDIwMzE1MTgw\nNzQ4WjAbMRkwFwYDVQQFExBmOTIwMDllODUzYjZiMDQ1MIICIjANBgkqhkiG9w0B\nAQEFAAOCAg8AMIICCgKCAgEAr7bHgiuxpwHsK7Qui8xUFmOr75gvMsd/dTEDDJdS\nSxtf6An7xyqpRR90PL2abxM1dEqlXnf2tqw1Ne4Xwl5jlRfdnJLmN0pTy/4lj4/7\ntv0Sk3iiKkypnEUtR6WfMgH0QZfKHM1+di+y9TFRtv6y//0rb+T+W8a9nsNL/ggj\nnar86461qO0rOs2cXjp3kOG1FEJ5MVmFmBGtnrKpa73XpXyTqRxB/M0n1n/W9nGq\nC4FSYa04T6N5RIZGBN2z2MT5IKGbFlbC8UrW0DxW7AYImQQcHtGl/m00QLVWutHQ\noVJYnFPlXTcHYvASLu+RhhsbDmxMgJJ0mcDpvsC4PjvB+TxywElgS70vE0XmLD+O\nJtvsBslHZvPBKCOdT0MS+tgSOIfga+z1Z1g7+DVagf7quvmag8jfPioyKvxnK/Eg\nsTUVi2ghzq8wm27ud/mIM7AY2qEORR8Go3TVB4HzWQgpZrt3i5MIlCaY504LzSRi\nigHCzAPlHws+W0rB5N+er5/2pJKnfBSDiCiFAVtCLOZ7gLiMm0jhO2B6tUXHI/+M\nRPjy02i59lINMRRev56GKtcd9qO/0kUJWdZTdA2XoS82ixPvZtXQpUpuL12ab+9E\naDK8Z4RHJYYfCT3Q5vNAXaiWQ+8PTWm2QgBR/bkwSWc+NpUFgNPN9PvQi8WEg5Um\nAGMCAwEAAaNjMGEwHQYDVR0OBBYEFDZh4QB8iAUJUYtEbEf/GkzJ6k8SMB8GA1Ud\nIwQYMBaAFDZh4QB8iAUJUYtEbEf/GkzJ6k8SMA8GA1UdEwEB/wQFMAMBAf8wDgYD\nVR0PAQH/BAQDAgIEMA0GCSqGSIb3DQEBCwUAA4ICAQB8cMqTllHc8U+qCrOlg3H7\n174lmaCsbo/bJ0C17JEgMLb4kvrqsXZs01U3mB/qABg/1t5Pd5AORHARs1hhqGIC\nW/nKMav574f9rZN4PC2ZlufGXb7sIdJpGiO9ctRhiLuYuly10JccUZGEHpHSYM2G\ntkgYbZba6lsCPYAAP83cyDV+1aOkTf1RCp/lM0PKvmxYN10RYsK631jrleGdcdkx\noSK//mSQbgcWnmAEZrzHoF1/0gso1HZgIn0YLzVhLSA/iXCX4QT2h3J5z3znluKG\n1nv8NQdxei2DIIhASWfu804CA96cQKTTlaae2fweqXjdN1/v2nqOhngNyz1361mF\nmr4XmaKH/ItTwOe72NI9ZcwS1lVaCvsIkTDCEXdm9rCNPAY10iTunIHFXRh+7KPz\nlHGewCq/8TOohBRn0/NNfh7uRslOSZ/xKbN9tMBtw37Z8d2vvnXq/YWdsm1+JLVw\nn6yYD/yacNJBlwpddla8eaVMjsF6nBnIgQOf9zKSe06nSTqvgwUHosgOECZJZ1Eu\nzbH4yswbt02tKtKEFhx+v+OTge/06V+jGsqTWLsfrOCNLuA8H++z+pUENmpqnnHo\nvaI47gC+TNpkgYGkkBT6B/m/U01BuOBBTzhIlMEZq9qkDWuM2cA5kW5V3FJUcfHn\nw1IdYIg2Wxg7yHcQZemFQg==\n-----END CERTIFICATE-----\n",
];

const mockCrl: CRL = {
  entries: {
    "09703144777339823906": {
      reason: "KEY_COMPROMISE",
      status: "REVOKED",
    },
    c8966fcb2fbb0d7a: {
      reason: "SOFTWARE_FLAW",
      status: "SUSPENDED",
    },
  },
};

describe("CertificatesValidation", () => {
  it("should return a revocation verification without errors", async () => {
    const validChain = validX509Chain.map((c) => new X509Certificate(c));
    const validation = await validateRevocation(validChain, mockCrl);
    expect(validation).toHaveProperty("success", true);
  });

  it("should return an issuance verification without errors", async () => {
    const validChain = validX509Chain.map((c) => new X509Certificate(c));
    const googlePublicKey = createPublicKey(
      decodeBase64String(GOOGLE_PUBLIC_KEY),
    );
    const validation = await validateIssuance(validChain, googlePublicKey);
    expect(validation).toHaveProperty("success", true);
  });

  it("should return a revocation verification with errors", async () => {
    const invalidChain = revokedX509Chain.map((c) => new X509Certificate(c));

    await expect(
      validateRevocation(invalidChain, mockCrl),
    ).resolves.toHaveProperty("success", false);
  });

  it("should return an issuance verification with errors", async () => {
    const validChain = validX509Chain.map((c) => new X509Certificate(c));
    const fakePublicKey = createPublicKey(
      decodeBase64String(HARDWARE_PUBLIC_TEST_KEY),
    );
    const validation = validateIssuance(validChain, fakePublicKey);
    expect(validation).toHaveProperty("success", false);
  });
});

describe("mergeCRL", () => {
  it("should return a valid merged CRL with single item", async () => {
    const crlA = {
      entries: {
        a: { reason: "KEY_COMPROMISE", status: "REVOKED" },
        b: { reason: "KEY_COMPROMISE", status: "REVOKED" },
        c: { reason: "KEY_COMPROMISE", status: "REVOKED" },
      },
    };

    const result = mergeCRL([crlA]);
    expect(result).toStrictEqual(crlA);
  });

  it("should return a valid merged CRL with multiple items", async () => {
    const crlA = {
      entries: {
        a: { reason: "KEY_COMPROMISE", status: "REVOKED" },
        b: { reason: "KEY_COMPROMISE", status: "REVOKED" },
        c: { reason: "KEY_COMPROMISE", status: "REVOKED" },
      },
    };

    const crlB = {
      entries: {
        a: { reason: "SOFTWARE_FLAW", status: "REVOKED" },
        d: { reason: "KEY_COMPROMISE", status: "REVOKED" },
      },
    };

    const mergedCrl = {
      entries: {
        a: { reason: "SOFTWARE_FLAW", status: "REVOKED" },
        b: { reason: "KEY_COMPROMISE", status: "REVOKED" },
        c: { reason: "KEY_COMPROMISE", status: "REVOKED" },
        d: { reason: "KEY_COMPROMISE", status: "REVOKED" },
      },
    };

    const result = mergeCRL([crlA, crlB]);
    expect(result).toStrictEqual(mergedCrl);
  });

  it("should return a valid merged CRL with an empty item", async () => {
    const crlA = {
      entries: {
        a: { reason: "KEY_COMPROMISE", status: "REVOKED" },
        b: { reason: "KEY_COMPROMISE", status: "REVOKED" },
        c: { reason: "KEY_COMPROMISE", status: "REVOKED" },
      },
    };

    const crlB = {
      entries: {},
    };

    const result = mergeCRL([crlA, crlB]);
    expect(result).toStrictEqual(crlA);
  });

  it("should return an empty CRL", async () => {
    const crlEmpty = {
      entries: {},
    };

    const result = mergeCRL([]);
    expect(result).toStrictEqual(crlEmpty);
  });
});
