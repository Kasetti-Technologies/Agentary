// ui/admin/src/api/apiClient.ts
// This is an updated placeholder that now supports both GET and POST requests.

const apiClient = {
  // The `<T>` makes our function generic, so it can handle any data type.
  get: async <T>(url: string): Promise<{ data: T }> => {
    console.log(`Fetching data from: ${url}`);

    // Placeholder data for the main driver list
    if (url === '/admin/drivers') {
      const fakeDrivers = [
        {
          driver_id: 'd-001',
          name: 'Snowflake Analytics Driver',
          vendor: 'Snowflake',
          supported_services: ['nlp', 'analytics'],
          base_monthly_price_cents: 50000,
          currency: 'USD',
          status: 'published' as const,
        },
        {
          driver_id: 'd-002',
          name: 'Salesforce CRM Connector',
          vendor: 'Salesforce',
          supported_services: ['crm', 'agentic-ai'],
          base_monthly_price_cents: 75000,
          currency: 'USD',
          status: 'staged' as const,
        },
      ];
      return Promise.resolve({ data: fakeDrivers as any as T });
    }

    // NEW: Placeholder data for a specific driver's artifacts
    if (url.startsWith('/admin/drivers/') && url.endsWith('/artifacts')) {
        const fakeArtifacts = [
            { artifact_id: 'art-001', version: '1.2.3', status: 'published', uploaded_at: new Date('2025-10-15T10:00:00Z').toISOString() },
            { artifact_id: 'art-002', version: '1.3.0', status: 'verified', uploaded_at: new Date('2025-10-28T14:30:00Z').toISOString() },
            { artifact_id: 'art-003', version: '1.3.1', status: 'uploaded', uploaded_at: new Date('2025-11-02T11:00:00Z').toISOString() },
        ];
        return Promise.resolve({ data: fakeArtifacts as any as T });
    }


    return Promise.resolve({ data: [] as any as T });
  },

  // NEW: Add the post method
  post: async <TResponse>(url: string, data?: any): Promise<{ data: TResponse }> => {
    console.log(`Posting data to: ${url}`, data);
    // For now, we'll just simulate a successful response with an empty object.
    alert(`(Dev Mock) POST request to ${url} was successful!`);
    return Promise.resolve({ data: {} as TResponse });
  },
};

export default apiClient;
