// src/k8s/k8sClient.ts
import * as k8s from '@kubernetes/client-node';

export function makeK8sClients() {
  const kc = new k8s.KubeConfig();
  // Try local config first (KUBECONFIG or ~/.kube/config); fall back to in-cluster
  try {
    kc.loadFromDefault();
  } catch {
    kc.loadFromCluster();
  }
  const apps = kc.makeApiClient(k8s.AppsV1Api);
  const core = kc.makeApiClient(k8s.CoreV1Api);
  return { kc, apps, core };
}

/**
 * Polls the Deployment until availableReplicas >= spec.replicas or timeout.
 */
export async function waitForDeploymentReady(
  apps: k8s.AppsV1Api,
  namespace: string,
  name: string,
  timeoutMs: number = 180000
): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    // Newer client-node expects an options object and returns V1Deployment directly
    const dep: k8s.V1Deployment = await apps.readNamespacedDeployment({
      name,
      namespace,
    });

    const specReplicas = dep.spec?.replicas ?? 1;
    const available = dep.status?.availableReplicas ?? 0;

    if (available >= specReplicas) {
      return;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }

  throw new Error(`Deployment ${namespace}/${name} not ready within ${timeoutMs}ms`);
}
