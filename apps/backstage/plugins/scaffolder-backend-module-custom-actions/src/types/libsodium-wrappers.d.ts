declare module 'libsodium-wrappers' {
  export const ready: Promise<void>;
  
  export function crypto_box_seal(
    message: string | Uint8Array,
    publicKey: Uint8Array
  ): Uint8Array;
  
  export function from_base64(input: string): Uint8Array;
  export function to_base64(input: Uint8Array): string;
}
