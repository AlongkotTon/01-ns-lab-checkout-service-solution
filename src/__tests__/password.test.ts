import { hashPassword, verifyPassword } from "../lib/password";

describe("password hashing", () => {
  it("verifies a correct password against its hash", async () => {
    const stored = await hashPassword("s3cret");
    expect(await verifyPassword("s3cret", stored)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const stored = await hashPassword("s3cret");
    expect(await verifyPassword("wrong", stored)).toBe(false);
  });

  it("salts: hashing the same password twice gives different strings", async () => {
    expect(await hashPassword("s3cret")).not.toBe(await hashPassword("s3cret"));
  });

  it('stores as "<salt>:<hash>" hex pair', async () => {
    const stored = await hashPassword("s3cret");
    expect(stored).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
  });

  it("rejects a malformed stored string instead of throwing", async () => {
    expect(await verifyPassword("s3cret", "not-a-valid-hash")).toBe(false);
  });
});
