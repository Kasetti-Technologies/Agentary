import axios from "axios";

export interface IssuedCredential {
  accessToken: string;
  expiresAt: Date;
  issuedAt: Date;
  tenantId: string;
  serviceId: string;
}

// Optional: describe the broker’s JSON shape for stronger typing
interface BrokerIssueResponse {
  access_token: string;
  expires_at: string;
  issued_at: string;
  tenant_id: string;
  service_id: string;
}

export class CredentialBrokerClient {
  private brokerUrl: string;
  private serviceId: string;

  constructor(brokerUrl: string, serviceId: string) {
    this.brokerUrl = brokerUrl;
    this.serviceId = serviceId;
  }

  async issueCredential(
    tenantId: string,
    correlationId?: string
  ): Promise<IssuedCredential> {
    const body = {
      tenant_id: tenantId,
      service_id: this.serviceId,
    };

    const headers: Record<string, string> = {};
    if (correlationId) {
      headers["X-Correlation-Id"] = correlationId;
    }

    // NOTE: no AxiosResponse import; we type the response body instead
    const response = await axios.post<BrokerIssueResponse>(this.brokerUrl, body, {
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
