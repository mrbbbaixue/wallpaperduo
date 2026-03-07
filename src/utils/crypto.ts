import CryptoJS from "crypto-js";

const ENCRYPTED_PREFIX = "enc::";

export const isEncryptedSecret = (value: string): boolean => value.startsWith(ENCRYPTED_PREFIX);

export const encryptSecret = (value: string, passphrase: string): string => {
  if (!value.trim()) {
    return value;
  }
  if (isEncryptedSecret(value)) {
    return value;
  }
  const cipher = CryptoJS.AES.encrypt(value, passphrase).toString();
  return `${ENCRYPTED_PREFIX}${cipher}`;
};

export const decryptSecret = (value: string, passphrase: string): string => {
  if (!value.trim() || !isEncryptedSecret(value)) {
    return value;
  }
  const raw = value.slice(ENCRYPTED_PREFIX.length);
  const decoded = CryptoJS.AES.decrypt(raw, passphrase).toString(CryptoJS.enc.Utf8);
  if (!decoded) {
    throw new Error("PASSCODE_INVALID");
  }
  return decoded;
};
