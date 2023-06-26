import { it, expect, describe, afterAll } from "vitest";
import { verify } from "../src";
import * as fs from "fs";
import * as http from "http";
import * as path from "path";

// EXAMPLE from https://www.ietf.org/archive/id/draft-ietf-oauth-selective-disclosure-jwt-04.html#name-example-1-sd-jwt

const sdjwt_signed_with_key_a = `eyJhbGciOiJSUzI1NiIsImtpZCI6ImtleS1hIn0.eyJfc2QiOiBbIjVuWHkwWjNRaUViYTFWMWxKemVLaEFPR1FYRmxLTElXQ0xsaGZfTy1jbW8iLCAiOWdaaEhBaFY3TFpuT0ZacV9xN0ZoOHJ6ZHFyck5NLWhSV3NWT2xXM251dyIsICJTLUpQQlNrdnFsaUZ2MV9fdGh1WHQzSXpYNUJfWlhtNFcycXM0Qm9ORnJBIiwgImJ2aXc3cFdBa2J6STA3OFpOVmFfZU1admswdGRQYTV3Mm85UjNaeWNqbzQiLCAiby1MQkNEckZGNnRDOWV3MXZBbFVtdzZZMzBDSFpGNWpPVUZocHg1bW9nSSIsICJwemtISU05c3Y3b1pINllLRHNScU5nRkdMcEVLSWozYzVHNlVLYVRzQWpRIiwgInJuQXpDVDZEVHk0VHNYOVFDRHYyd3dBRTRaZTIwdVJpZ3RWTlFrQTUyWDAiXSwgImlzcyI6ICJodHRwczovL2V4YW1wbGUuY29tL2lzc3VlciIsICJpYXQiOiAxNTE2MjM5MDIyLCAiZXhwIjogMTczNTY4OTY2MSwgIl9zZF9hbGciOiAic2hhLTI1NiIsICJjbmYiOiB7Imp3ayI6IHsia3R5IjogIkVDIiwgImNydiI6ICJQLTI1NiIsICJ4IjogIlRDQUVSMTladnUzT0hGNGo0VzR2ZlNWb0hJUDFJTGlsRGxzN3ZDZUdlbWMiLCAieSI6ICJaeGppV1diWk1RR0hWV0tWUTRoYlNJaXJzVmZ1ZWNDRTZ0NGpUOUYySFpRIn19fQ.o8LaAzZQNm1vaYS_0ZO-Gc33a2IA6RmXt1mdHLbcuAsNtbLwNaVc-s0iNIPA7J8qwJ8MQjSx9tGSB04XXnHyRw1HmW4FkWuS0bmJ_CqlO7ZP4BryA6geCMoK-PaT0HFcv3MX0QFOkhtMISdu4BUjcSCYWMZMIrf5lSzm-qWXKKKsC0KsvMP4l7L9ymB-4RF5jJPixtjpn6zOdjLlDKYpCdMjIXqnYwavgUh9mc4CZZ5R-IEVZVueOhQYGndgTHcdEQgbQt_LFncYJKBaFAVxvCEkm9RRr9j2dpUODsn_39vqMVOjrVAHgaK6BYtlFMqyGkypGyKv-6s5XXmDTSawYA`;
const disclosure_tokens = [
  "WyJyU0x1em5oaUxQQkRSWkUxQ1o4OEtRIiwgInN1YiIsICJqb2huX2RvZV80MiJd",
  "WyJhYTFPYmdlUkJnODJudnpMYnRQTklRIiwgImdpdmVuX25hbWUiLCAiSm9obiJd",
  "WyI2VWhsZU5HUmJtc0xDOFRndTh2OFdnIiwgImZhbWlseV9uYW1lIiwgIkRvZSJd",
  "WyJ2S0t6alFSOWtsbFh2OWVkNUJ1ZHZRIiwgImVtYWlsIiwgImpvaG5kb2VAZXhhbXBsZS5jb20iXQ",
  "WyJVZEVmXzY0SEN0T1BpZDRFZmhPQWNRIiwgInBob25lX251bWJlciIsICIrMS0yMDItNTU1LTAxMDEiXQ",
  "WyJOYTNWb0ZGblZ3MjhqT0FyazdJTlZnIiwgImFkZHJlc3MiLCB7InN0cmVldF9hZGRyZXNzIjogIjEyMyBNYWluIFN0IiwgImxvY2FsaXR5IjogIkFueXRvd24iLCAicmVnaW9uIjogIkFueXN0YXRlIiwgImNvdW50cnkiOiAiVVMifV0",
  "WyJkQW9mNHNlZTFGdDBXR2dHanVjZ2pRIiwgImJpcnRoZGF0ZSIsICIxOTQwLTAxLTAxIl0",
];
const sdjwt_with_disclosures_signed_with_key_a = [
  sdjwt_signed_with_key_a,
  ...disclosure_tokens,
].join("~");

const sdjwt_with_wrong_disclosures_signed_with_key_a = [
  sdjwt_signed_with_key_a,
  ...disclosure_tokens,
  "malformed-disclosure",
].join("~");

const sdjwt_signed_with_key_a_missing_claims =
  "eyJhbGciOiJSUzI1NiIsImtpZCI6ImtleS1hIn0.eyJfc2QiOlsiUy1KUEJTa3ZxbGlGdjFfX3RodVh0M0l6WDVCX1pYbTRXMnFzNEJvTkZyQSIsImJ2aXc3cFdBa2J6STA3OFpOVmFfZU1admswdGRQYTV3Mm85UjNaeWNqbzQiLCJvLUxCQ0RyRkY2dEM5ZXcxdkFsVW13NlkzMENIWkY1ak9VRmhweDVtb2dJIiwicHprSElNOXN2N29aSDZZS0RzUnFOZ0ZHTHBFS0lqM2M1RzZVS2FUc0FqUSIsInJuQXpDVDZEVHk0VHNYOVFDRHYyd3dBRTRaZTIwdVJpZ3RWTlFrQTUyWDAiXSwiaXNzIjoiaHR0cHM6Ly9leGFtcGxlLmNvbS9pc3N1ZXIiLCJpYXQiOjE1MTYyMzkwMjIsImV4cCI6MTczNTY4OTY2MSwiX3NkX2FsZyI6InNoYS0yNTYiLCJjbmYiOnsiandrIjp7Imt0eSI6IkVDIiwiY3J2IjoiUC0yNTYiLCJ4IjoiVENBRVIxOVp2dTNPSEY0ajRXNHZmU1ZvSElQMUlMaWxEbHM3dkNlR2VtYyIsInkiOiJaeGppV1diWk1RR0hWV0tWUTRoYlNJaXJzVmZ1ZWNDRTZ0NGpUOUYySFpRIn19fQ.R8ZH5VMfM3RhlW2o8tA2uoDB3b7_pZcuX4RSPzrJpWNLzBpURNA-aXR29IZD0iHfvxSFbxjDIVMhinQHulQ2_mn7CMhJM-eqcmVmbZsAXMHhFIC4uj1T0c6hp-r_Z6UU3v1kPqKXm9PaJAAKIT5fmnoqkLSZVEAjHwLD0lAK1wkaPzLUXVmFrByNrI5wNWGxTkTNRkSIbrgbZariUsFVQwcH0TWuCAWaKR72jNYSSfV-9AjeEBiImC1Q4X_4Zi6_jXRzf3pv7K_LTQRMbj-5OPprk5ftC2Glwjbnycq6QKCeXVPr_VKQa6tK6RG4-z-80ZOu1jve1kXwPa3nzqNLyA";

const sdjwt_with_disclosures_signed_with_key_a_missing_claims = [
  sdjwt_signed_with_key_a_missing_claims,
  ...disclosure_tokens,
].join("~");

// A local server to serve JWKS files
// It retrieves any file that ends with jwks.json
const SERVER_PORT = 8125;
const server: http.Server = http
  .createServer(function ({ url }, response) {
    const notFound = (reason = "") => {
      console.debug(`Not Found, reason: ${reason}`);
      response.writeHead(404);
      response.end();
    };

    if (typeof url !== "string") {
      notFound("url is not string");
    } else if (!url.endsWith("jwks.json")) {
      notFound("does not end with jwks.json");
    } else {
      const filename = url.split("/").reverse()[0];
      const filePath = path.resolve(`${__filename}/../.keys/${filename}`);

      fs.readFile(filePath, function (error, content) {
        if (error) {
          if (error.code == "ENOENT") {
            notFound(`file not found: ${filePath}`);
          } else {
            // TODO: provide insights of the error fot troubleshooting
            notFound(error === null ? "unknown error" : error.message);
          }
        } else {
          response.writeHead(200);
          response.end(content, "utf-8");
        }
      });
    }
  })
  .listen(SERVER_PORT)
  .on("listening", () =>
    console.debug(`Accepting requests at http://localhost:${SERVER_PORT}`)
  )
  .on("close", () => console.debug("Closing server..."));

// helper to format a url to a well-known file
const wellKnownUrl = (name) =>
  `http://localhost:${SERVER_PORT}/.well-known/${name}.jwks.json`;

describe("Verify", () => {
  afterAll(() => {
    server.close();
  });

  it("should verify a valid token", async () => {
    const [parsed_sdjwt, ...parsed_disclosures] = await verify(
      sdjwt_with_disclosures_signed_with_key_a,
      {
        jwksUri: wellKnownUrl("a-and-b"),
      }
    );

    expect(parsed_sdjwt).toEqual(
      expect.objectContaining({ payload: expect.any(Object) })
    );
    // All disclosure are included in the parsed result
    expect(parsed_disclosures).toHaveLength(disclosure_tokens.length);
    // Every parsed disclosure is a triplet
    for (const pd of parsed_disclosures) {
      expect(pd).toEqual([
        expect.any(String),
        expect.any(String),
        expect.anything(),
      ]);
    }
  });
  it("should fail when the token is signed with a non-valid key", () => {
    const op = verify(sdjwt_with_disclosures_signed_with_key_a, {
      jwksUri: wellKnownUrl("just-b"),
    });
    expect(op).rejects.toBeInstanceOf(Error);
  });
  it("should fail when a non-reachable jwksUri is provided (not found)", () => {
    const op = verify(sdjwt_with_disclosures_signed_with_key_a, {
      jwksUri: wellKnownUrl("wrong"),
    });
    expect(op).rejects.toBeInstanceOf(Error);
  });
  it("should fail when a non-reachable jwksUri is provided (connection refused)", () => {
    const op = verify(sdjwt_with_disclosures_signed_with_key_a, {
      jwksUri: "http://example.com/.well-known/a-and-b.jwks.json",
    });

    expect(op).rejects.toBeInstanceOf(Error);
  });

  it("should fail if at least one disclosure fails to parse", () => {
    const op = verify(sdjwt_with_wrong_disclosures_signed_with_key_a, {
      jwksUri: wellKnownUrl("a-and-b"),
    });
    expect(op).rejects.toBeInstanceOf(Error);
  });

  it("should fail if at least one disclosure is missing in the SD-JWT", () => {
    const op = verify(sdjwt_with_disclosures_signed_with_key_a_missing_claims, {
      jwksUri: wellKnownUrl("a-and-b"),
    });
    expect(op).rejects.toBeInstanceOf(Error);
  });
});
