// src/runtime/CredentialStore.ts
import type { IssuedCredential } from "./credentialBrokerClient";

export class CredentialStore {
  private current: IssuedCredential | null = null;

  set(cred: IssuedCredential): void {
    this.current = cred;
  }

  get(): IssuedCredential {
    if (!this.current) {
      throw new Error("No credential loaded yet");
    }
    return this.current;
  }

  hasCredential(): boolean {
    return this.current !== null;
  }
}

// Global singleton store for the process
export const globalCredentialStore = new CredentialStore();
