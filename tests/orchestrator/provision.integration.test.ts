import { execSync } from 'child_process';

describe('orchestrator deployment labels', () => {
  it('has required labels on Deployment and Pod template', () => {
    // Call kubectl to get the Deployment as JSON
    const output = execSync(
      'kubectl get deployment agentary-tenant-123-myservice -n default -o json',
      { encoding: 'utf-8' }
    );

    const dep = JSON.parse(output);
    const depLabels = dep.metadata?.labels ?? {};
    const podTemplateLabels = dep.spec?.template?.metadata?.labels ?? {};

    // Deployment-level labels
    expect(depLabels.tenant_id).toBe('tenant-123');
    expect(depLabels.service_type).toBe('myservice');
    expect(depLabels.billing_enabled).toBe('true');

    // Pod template labels
    expect(podTemplateLabels.tenant_id).toBe('tenant-123');
    expect(podTemplateLabels.service_type).toBe('myservice');
    // Optional: only if you added this label on the pod template as well
    // expect(podTemplateLabels.billing_enabled).toBe('true');
  });
});
