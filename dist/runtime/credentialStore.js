"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalCredentialStore = exports.CredentialStore = void 0;
class CredentialStore {
    current = null;
    set(cred) {
        this.current = cred;
    }
    get() {
        if (!this.current) {
            throw new Error("No credential loaded yet");
        }
        return this.current;
    }
    hasCredential() {
        return this.current !== null;
    }
}
exports.CredentialStore = CredentialStore;
// Global singleton store for the process
exports.globalCredentialStore = new CredentialStore();
