import { it, expect, describe, afterAll } from "vitest";
import { verify } from "../src";
import * as fs from "fs";
import * as http from "http";
import * as path from "path";

// EXAMPLE from https://www.ietf.org/archive/id/draft-ietf-oauth-selective-disclosure-jwt-04.html#name-example-1-sd-jwt
const sdjwt_header_and_payload =
  "eyJhbGciOiJSUzI1NiIsImtpZCI6ImtleS1hIn0.eyJfc2QiOiBbIjVuWHkwWjNRaUViYTFWMWxKemVLaEFPR1FYRmxLTElXQ0xsaGZfTy1jbW8iLCAiOWdaaEhBaFY3TFpuT0ZacV9xN0ZoOHJ6ZHFyck5NLWhSV3NWT2xXM251dyIsICJTLUpQQlNrdnFsaUZ2MV9fdGh1WHQzSXpYNUJfWlhtNFcycXM0Qm9ORnJBIiwgImJ2aXc3cFdBa2J6STA3OFpOVmFfZU1admswdGRQYTV3Mm85UjNaeWNqbzQiLCAiby1MQkNEckZGNnRDOWV3MXZBbFVtdzZZMzBDSFpGNWpPVUZocHg1bW9nSSIsICJwemtISU05c3Y3b1pINllLRHNScU5nRkdMcEVLSWozYzVHNlVLYVRzQWpRIiwgInJuQXpDVDZEVHk0VHNYOVFDRHYyd3dBRTRaZTIwdVJpZ3RWTlFrQTUyWDAiXSwgImlzcyI6ICJodHRwczovL2V4YW1wbGUuY29tL2lzc3VlciIsICJpYXQiOiAxNTE2MjM5MDIyLCAiZXhwIjogMTczNTY4OTY2MSwgIl9zZF9hbGciOiAic2hhLTI1NiIsICJjbmYiOiB7Imp3ayI6IHsia3R5IjogIkVDIiwgImNydiI6ICJQLTI1NiIsICJ4IjogIlRDQUVSMTladnUzT0hGNGo0VzR2ZlNWb0hJUDFJTGlsRGxzN3ZDZUdlbWMiLCAieSI6ICJaeGppV1diWk1RR0hWV0tWUTRoYlNJaXJzVmZ1ZWNDRTZ0NGpUOUYySFpRIn19fQ";
const sdjwt_signed_with_key_a = `${sdjwt_header_and_payload}.o8LaAzZQNm1vaYS_0ZO-Gc33a2IA6RmXt1mdHLbcuAsNtbLwNaVc-s0iNIPA7J8qwJ8MQjSx9tGSB04XXnHyRw1HmW4FkWuS0bmJ_CqlO7ZP4BryA6geCMoK-PaT0HFcv3MX0QFOkhtMISdu4BUjcSCYWMZMIrf5lSzm-qWXKKKsC0KsvMP4l7L9ymB-4RF5jJPixtjpn6zOdjLlDKYpCdMjIXqnYwavgUh9mc4CZZ5R-IEVZVueOhQYGndgTHcdEQgbQt_LFncYJKBaFAVxvCEkm9RRr9j2dpUODsn_39vqMVOjrVAHgaK6BYtlFMqyGkypGyKv-6s5XXmDTSawYA`;
const disclosure_tokens = [
  "WyJyU0x1em5oaUxQQkRSWkUxQ1o4OEtRIiwgInN1YiIsICJqb2huX2RvZV80MiJd",
  "WyJhYTFPYmdlUkJnODJudnpMYnRQTklRIiwgImdpdmVuX25hbWUiLCAiSm9obiJd",
  "WyI2VWhsZU5HUmJtc0xDOFRndTh2OFdnIiwgImZhbWlseV9uYW1lIiwgIkRvZSJd",
  "WyJ2S0t6alFSOWtsbFh2OWVkNUJ1ZHZRIiwgImVtYWlsIiwgImpvaG5kb2VAZXhhbXBsZS5jb20iXQ",
  "WyJVZEVmXzY0SEN0T1BpZDRFZmhPQWNRIiwgInBob25lX251bWJlciIsICIrMS0yMDItNTU1LTAxMDEiXQ",
  "WyJOYTNb0ZGblZ3MjhqT0FyazdJTlZnIiwgImFkZHJlc3MiLCB7InN0cmVldF9hZGRyZXNzIjogIjEyMyBNYWluIFN0IiwgImxvY2FsaXR5IjogIkFueXRvd24iLCAicmVnaW9uIjogIkFueXN0YXRlIiwgImNvdW50cnkiOiAiVVMifV0",
  "WyJkQW9mNHNlZTFGdDBXR2dHanVjZ2pRIiwgImJpcnRoZGF0ZSIsICIxOTQwLTAxLTAxIl0",
];
const sdjwt_with_disclosures_signed_with_key_a = [
  sdjwt_signed_with_key_a,
  disclosure_tokens,
].join("~");

const sdjwt_signed_with_hs256 =
  "eyJhbGciOiJIUzI1NiIsImN0eSI6IkpXVCJ9.eyJfc2QiOlsiNW5YeTBaM1FpRWJhMVYxbEp6ZUtoQU9HUVhGbEtMSVdDTGxoZl9PLWNtbyIsIjlnWmhIQWhWN0xabk9GWnFfcTdGaDhyemRxcnJOTS1oUldzVk9sVzNudXciLCJTLUpQQlNrdnFsaUZ2MV9fdGh1WHQzSXpYNUJfWlhtNFcycXM0Qm9ORnJBIiwiYnZpdzdwV0FrYnpJMDc4Wk5WYV9lTVp2azB0ZFBhNXcybzlSM1p5Y2pvNCIsIm8tTEJDRHJGRjZ0QzlldzF2QWxVbXc2WTMwQ0haRjVqT1VGaHB4NW1vZ0kiLCJwemtISU05c3Y3b1pINllLRHNScU5nRkdMcEVLSWozYzVHNlVLYVRzQWpRIiwicm5BekNUNkRUeTRUc1g5UUNEdjJ3d0FFNFplMjB1UmlndFZOUWtBNTJYMCJdLCJpc3MiOiJodHRwczovL2V4YW1wbGUuY29tL2lzc3VlciIsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjoxNzM1Njg5NjYxLCJfc2RfYWxnIjoic2hhLTI1NiIsImNuZiI6eyJqd2siOnsia3R5IjoiRUMiLCJjcnYiOiJQLTI1NiIsIngiOiJUQ0FFUjE5WnZ1M09IRjRqNFc0dmZTVm9ISVAxSUxpbERsczd2Q2VHZW1jIiwieSI6Ilp4amlXV2JaTVFHSFZXS1ZRNGhiU0lpcnNWZnVlY0NFNnQ0alQ5RjJIWlEifX19.nkSextGKqSz-s3X0sJmALGhx_Q88LrHPIm5B3r0Jv04";
const sdjwt_with_disclosures_signed_with_hs256 = [
  sdjwt_signed_with_key_a,
  disclosure_tokens,
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
            // TODO: provide insights of the error for troubleshooting
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
    await verify(sdjwt_with_disclosures_signed_with_key_a, {
      jwksUri: wellKnownUrl("a-and-b"),
    });
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

  it("should not support symmetrical signature algorithms", () => {
    const op = verify(sdjwt_with_disclosures_signed_with_hs256, {
      jwksUri: "anything", // it shouldn't even be called
    });

    expect(op).rejects.toBeInstanceOf(Error);
  });
});
