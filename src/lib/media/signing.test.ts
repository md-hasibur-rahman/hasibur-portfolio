import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cloudinarySettings, signUploadRequest, uploadEndpoint, type CloudinarySettings } from "@/lib/cloudinary/server";
import { issueUploadTicket, readUploadTicket } from "@/lib/media/pending";

// Fixed values so the expected signature is computed, not copied from the SDK.
process.env.AUTH_SECRET = "unit-test-secret-value-0123456789abcdef";

const settings: CloudinarySettings = {
  cloudName: "demo-cloud",
  apiKey: "api-key-abc",
  apiSecret: "top-secret-xyz",
  folder: "portfolio",
};

afterEach(() => {
  vi.useRealTimers();
});

describe("signed Cloudinary uploads", () => {
  it("signs exactly the params the browser is allowed to send", () => {
    const params = { publicId: "portfolio/images/1700000000-cover-a1b2c3", timestamp: 1_700_000_000 };

    const signature = signUploadRequest(settings, params);

    // Sorted key=value pairs, api secret appended, sha256 — the algorithm Cloudinary expects.
    // The folder parameter is deliberately absent: it would be concatenated onto the already
    // path-bearing public_id and store the file under folder/folder/name.
    const toSign = `public_id=${params.publicId}&timestamp=${params.timestamp}${settings.apiSecret}`;
    expect(signature).toBe(createHash("sha256").update(toSign).digest("hex"));
    expect(signature).not.toContain(settings.apiSecret);
  });

  it("points the browser at the resource type we chose", () => {
    expect(uploadEndpoint(settings, "IMAGE")).toBe(
      "https://api.cloudinary.com/v1_1/demo-cloud/image/upload",
    );
    expect(uploadEndpoint(settings, "VIDEO")).toBe(
      "https://api.cloudinary.com/v1_1/demo-cloud/video/upload",
    );
  });

  it("reports unconfigured when any credential is missing", () => {
    const saved = {
      cloud: process.env.CLOUDINARY_CLOUD_NAME,
      key: process.env.CLOUDINARY_API_KEY,
      secret: process.env.CLOUDINARY_API_SECRET,
    };
    process.env.CLOUDINARY_API_SECRET = "";
    expect(cloudinarySettings()).toBeNull();
    Object.assign(process.env, {
      CLOUDINARY_CLOUD_NAME: saved.cloud ?? "",
      CLOUDINARY_API_KEY: saved.key ?? "",
      CLOUDINARY_API_SECRET: saved.secret ?? "",
    });
  });
});

describe("upload tickets", () => {
  const pending = {
    publicId: "portfolio/images/1700000000-cover-a1b2c3",
    resourceType: "IMAGE" as const,
    actorId: "user-one",
  };

  function tamper(body: object, signature: string) {
    return `${Buffer.from(JSON.stringify(body), "utf8").toString("base64url")}.${signature}`;
  }

  it("round-trips a ticket we issued", () => {
    expect(readUploadTicket(issueUploadTicket(pending))).toMatchObject(pending);
  });

  it("rejects a body swapped for another admin or public id", () => {
    const [body, signature] = issueUploadTicket(pending).split(".");
    expect(readUploadTicket(tamper({ ...pending, actorId: "user-two" }, signature))).toBeNull();
    expect(readUploadTicket(tamper({ ...pending, publicId: "portfolio/images/other" }, signature))).toBeNull();
    expect(readUploadTicket(`${body}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`)).toBeNull();
  });

  it("rejects malformed tickets", () => {
    expect(readUploadTicket("")).toBeNull();
    expect(readUploadTicket("only-one-part")).toBeNull();
    expect(readUploadTicket("!!!.!!!")).toBeNull();
    expect(readUploadTicket("bm90LWpzb24.Y3hpZw")).toBeNull();
  });

  it("expires after the upload window", () => {
    vi.useFakeTimers();
    const ticket = issueUploadTicket(pending);
    expect(readUploadTicket(ticket)).not.toBeNull();

    vi.setSystemTime(Date.now() + 11 * 60 * 1000);
    expect(readUploadTicket(ticket)).toBeNull();
  });
});
