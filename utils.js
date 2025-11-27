import * as Crypto from "expo-crypto";

export async function sha1(data) {
  const normalized =
    typeof data === "string" ? data : JSON.stringify(data ?? "");

  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA1,
    normalized
  );
}