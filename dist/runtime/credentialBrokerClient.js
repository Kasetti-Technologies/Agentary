"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialBrokerClient = void 0;
const axios_1 = __importDefault(require("axios"));
class CredentialBrokerClient {
    brokerUrl;
    serviceId;
    constructor(brokerUrl, serviceId) {
        this.brokerUrl = brokerUrl;
        this.serviceId = serviceId;
    }
    async issueCredential(tenantId, correlationId) {
        const body = {
            tenant_id: tenantId,
            service_id: this.serviceId,
        };
        const headers = {};
        if (correlationId) {
            headers["X-Correlation-Id"] = correlationId;
        }
        // NOTE: no AxiosResponse import; we type the response body instead
        const response = await axios_1.default.post(this.brokerUrl, body, {
            headers,
        });
        const data = response.data;
        return {
            accessToken: data.access_token,
            expiresAt: new Date(data.expires_at),
            issuedAt: new Date(data.issued_at),
            tenantId: data.tenant_id,
            serviceId: data.service_id,
        };
    }
}
exports.CredentialBrokerClient = CredentialBrokerClient;
