import { it, expect, describe } from "vitest";
import { decode } from "..";

const sdjwt =
  "eyJ0eXAiOiJ2YytzZC1qd3QiLCJhbGciOiJSUzUxMiIsImtpZCI6ImQxMjZhNmE4NTZmNzcyNDU2MDQ4NGZhOWRjNTlkMTk1IiwidHJ1c3RfY2hhaW4iOlsiTkVoUmRFUnBZbmxIWTNNNVdsZFdUV1oyYVVobSAuLi4iLCJleUpoYkdjaU9pSlNVekkxTmlJc0ltdHBaQ0k2IC4uLiIsIklrSllkbVp5Ykc1b1FVMTFTRkl3TjJGcVZXMUIgLi4uIl19.eyJpc3MiOiJodHRwczovL3BpZHByb3ZpZGVyLmV4YW1wbGUub3JnIiwic3ViIjoiTnpiTHNYaDh1RENjZDdub1dYRlpBZkhreFpzUkdDOVhzLi4uIiwianRpIjoidXJuOnV1aWQ6NmM1YzBhNDktYjU4OS00MzFkLWJhZTctMjE5MTIyYTllYzJjIiwiaWF0IjoxNTQxNDkzNzI0LCJleHAiOjE1NDE0OTM3MjQsInN0YXR1cyI6Imh0dHBzOi8vcGlkcHJvdmlkZXIuZXhhbXBsZS5vcmcvc3RhdHVzIiwiY25mIjp7Imp3ayI6eyJrdHkiOiJSU0EiLCJ1c2UiOiJzaWciLCJuIjoiMVRhLXNFIOKApiIsImUiOiJBUUFCIiwia2lkIjoiWWhORlMzWW5DOXRqaUNhaXZoV0xWVUozQXh3R0d6Xzk4dVJGYXFNRUVzIn19LCJ0eXBlIjoiUGVyc29uSWRlbnRpZmljYXRpb25EYXRhIiwidmVyaWZpZWRfY2xhaW1zIjp7InZlcmlmaWNhdGlvbiI6eyJfc2QiOlsiT0dtN3J5WGd0NVh6bGV2cC1IdS1VVGswYS1UeEFhUEFvYnF2MXBJV01mdyJdLCJ0cnVzdF9mcmFtZXdvcmsiOiJlaWRhcyIsImFzc3VyYW5jZV9sZXZlbCI6ImhpZ2gifSwiY2xhaW1zIjp7Il9zZCI6WyI4SmpvekJmb3ZNTnZRM0hmbG1QV3k0TzE5R3B4czYxRldIalplYlU1ODlFIiwiQm9NR2t0VzFyYmlrbnR3OEZ6eF9CZUw0WWJBbmRyNkFIc2RncGF0RkNpZyIsIkNGTEd6ZW50R05SRm5nbkxWVlFWY29BRmkwNXI2UkpVWC1yZGJMZEVmZXciLCJKVV9zVGFIQ25nUzMyWC0wYWpIcmQxLUhDTENrcFQ1WXFnY2ZRbWUxNjh3IiwiVlFJLVMxbVQxS3hmcTJvOEo5aW83eE1NWDJNSXhhRzlNOVBlSlZxck1jQSIsInpWZGdoY21DbE1WV2xVZ0dzR3BTa0NQa0VIWjR1OW9XajFTbElCbENjMW8iXX19LCJfc2RfYWxnIjoic2hhLTI1NiJ9.WzEiFaOjnobQisjTQ92JtKEXRN-2Sgvjklpu4IdC_cT2T6Tm8Z6sqbVy6n94AAEv-HFSv5JoSt6YjPDnGzOxN_W_131rILU8YaiNt8w31nRGIvHjJIC0w-hHIcG1LmvJshSMcT3RHeApRCmsO7xkHWmUsjt37dOzEagEti5i47hnZAbu7vWXsvUlBNNN8v7tJBLspO2Q0vnWhEDX1hQ7IH1b8oKh-_aQrhwVm9Bcs9CG8o6N9iqubCSpFI6Gty4ZZgHEb95knETVhw8IL10Z9P_Hr9twXZQaCCC8xrNh4afwR9TiDQzTr92m7luyvDfmzVgHCponI7VBhqmRqZVYQyDhq6EJbtRtIsYenla5NSKBjV8Etdlec94vJAHZNzue9aNUQeXae55V5m5O9wLoWhgV2vl4xV5C-N5s5Uzs08GAxo-CUaNOD3BQE9vfrT47IBCm4hUCnvDise_aWNCeKOQABV1J9_tV9lWZsECVuUuWWwELHCUXgdyiA3QtUtXz";

const disclosures = [
  "WyIyR0xDNDJzS1F2ZUNmR2ZyeU5STjl3IiwgImV2aWRlbmNlIiwgW3sidHlwZSI6ICJlbGVjdHJvbmljX3JlY29yZCIsICJyZWNvcmQiOiB7InR5cGUiOiAiZWlkYXMuaXQuY2llIiwgInNvdXJjZSI6IHsib3JnYW5pemF0aW9uX25hbWUiOiAiTWluaXN0ZXJvIGRlbGwnSW50ZXJubyIsICJvcmdhbml6YXRpb25faWQiOiAibV9pdCIsICJjb3VudHJ5X2NvZGUiOiAiSVQifX19XV0",
  "WyJlbHVWNU9nM2dTTklJOEVZbnN4QV9BIiwgInVuaXF1ZV9pZCIsICJ4eHh4eHh4eC14eHh4LXh4eHgteHh4eC14eHh4eHh4eHh4eHgiXQ",
  "WyI2SWo3dE0tYTVpVlBHYm9TNXRtdlZBIiwgImdpdmVuX25hbWUiLCAiTWFyaW8iXQ",
  "WyJlSThaV205UW5LUHBOUGVOZW5IZGhRIiwgImZhbWlseV9uYW1lIiwgIlJvc3NpIl0",
  "WyJRZ19PNjR6cUF4ZTQxMmExMDhpcm9BIiwgImJpcnRoZGF0ZSIsICIxOTgwLTAxLTEwIl0",
  "WyJBSngtMDk1VlBycFR0TjRRTU9xUk9BIiwgInBsYWNlX29mX2JpcnRoIiwgeyJjb3VudHJ5IjogIklUIiwgImxvY2FsaXR5IjogIlJvbWUifV0",
  "WyJQYzMzSk0yTGNoY1VfbEhnZ3ZfdWZRIiwgInRheF9pZF9jb2RlIiwgIlRJTklULVhYWFhYWFhYWFhYWFhYWFgiXQ",
];

const token = [sdjwt, ...disclosures].join("~");

describe("decode", () => {
  it("should return pid, sd-jwt and disclosures", async () => {
    const result = decode(token);

    // check shallow shape
    expect(result).toEqual(
      expect.objectContaining({
        pid: expect.any(Object),
        sdJwt: expect.any(Object),
        disclosures: expect.any(Array),
      })
    );

    // check pid in deep
    expect(result.pid).toEqual({
      issuer: "https://pidprovider.example.org",
      issuedAt: new Date(1541493724000),
      expiration: new Date(1541493724000),
      verification: {
        trustFramework: "eidas",
        assuranceLevel: "high",
        evidence: [
          {
            type: "electronic_record",
            record: {
              type: "eidas.it.cie",
              source: {
                organization_name: "Ministero dell'Interno",
                organization_id: "m_it",
                country_code: "IT",
              },
            },
          },
        ],
      },
      claims: {
        uniqueId: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        givenName: "Mario",
        familyName: "Rossi",
        birthdate: "1980-01-10",
        placeOfBirth: { country: "IT", locality: "Rome" },
        taxIdCode: "TINIT-XXXXXXXXXXXXXXXX",
      },
    });
  });

  it("should return a valid pid", async () => {
    const result = decode(token);

    expect(result.pid).toEqual({
      issuer: "https://pidprovider.example.org",
      issuedAt: new Date(1541493724000),
      expiration: new Date(1541493724000),
      verification: {
        trustFramework: "eidas",
        assuranceLevel: "high",
        evidence: [
          {
            type: "electronic_record",
            record: {
              type: "eidas.it.cie",
              source: {
                organization_name: "Ministero dell'Interno",
                organization_id: "m_it",
                country_code: "IT",
              },
            },
          },
        ],
      },
      claims: {
        uniqueId: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        givenName: "Mario",
        familyName: "Rossi",
        birthdate: "1980-01-10",
        placeOfBirth: { country: "IT", locality: "Rome" },
        taxIdCode: "TINIT-XXXXXXXXXXXXXXXX",
      },
    });
  });
});
