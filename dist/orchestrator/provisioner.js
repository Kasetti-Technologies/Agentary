"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.provisionClientContainer = provisionClientContainer;
const k8s = __importStar(require("@kubernetes/client-node"));
function makeK8sClients() {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    if (!kc.getCurrentContext()) {
        kc.loadFromCluster();
    }
    return {
        apps: kc.makeApiClient(k8s.AppsV1Api),
        core: kc.makeApiClient(k8s.CoreV1Api),
    };
}
// Normalize client-node return shapes across versions ({ body } vs direct object)
function unwrap(resp) {
    return resp && typeof resp === 'object' && 'body' in resp ? resp.body : resp;
}
function statusCodeOf(e) {
    return e?.response?.statusCode ?? e?.code ?? e?.statusCode;
}
async function ensureNamespace(core, ns) {
    try {
        const resp = await core.readNamespace({ name: ns });
        const body = unwrap(resp);
        if (!body?.metadata?.name) {
            throw new Error(`Namespace ${ns} read returned no metadata`);
        }
    }
    catch (e) {
        const status = statusCodeOf(e);
        if (status === 404) {
            await core.createNamespace({
                body: {
                    apiVersion: 'v1',
                    kind: 'Namespace',
                    metadata: { name: ns },
                },
            });
        }
        else {
            throw e;
        }
    }
}
// Upsert Secret: read → replace with resourceVersion, or create on 404
async function upsertSecret(core, namespace, name, desired) {
    try {
        const resp = await core.readNamespacedSecret({ name, namespace });
        const existing = unwrap(resp);
        const resourceVersion = existing?.metadata?.resourceVersion;
        const updated = JSON.parse(JSON.stringify(desired));
        updated.metadata = updated.metadata ?? {};
        updated.metadata.resourceVersion = resourceVersion;
        await core.replaceNamespacedSecret({ name, namespace, body: updated });
    }
    catch (e) {
        const status = statusCodeOf(e);
        if (status === 404) {
            await core.createNamespacedSecret({ namespace, body: desired });
        }
        else {
            throw e;
        }
    }
}
async function waitForDeploymentReady(apps, namespace, name, opts) {
    const timeoutMs = opts?.timeoutMs ?? 300_000; // 5m
    const intervalMs = opts?.intervalMs ?? 3_000; // 3s
    const start = Date.now();
    while (true) {
        const resp = await apps.readNamespacedDeployment({ name, namespace });
        const dep = unwrap(resp);
        const status = dep?.status;
        const available = status?.availableReplicas ?? 0;
        const desired = status?.replicas ?? 0;
        const hasAvailableCondition = !!status?.conditions?.some((c) => c.type === 'Available' && c.status === 'True');
        if (desired > 0 && (available >= 1 || hasAvailableCondition)) {
            return;
        }
        if (Date.now() - start > timeoutMs) {
            throw new Error(`Timeout waiting for Deployment ${namespace}/${name} to be ready (available=${available}, desired=${desired})`);
        }
        await new Promise((r) => setTimeout(r, intervalMs));
    }
}
// Simple audit logger (JSON line to stderr)
function auditProvision(payload) {
    const entry = {
        ts: new Date().toISOString(),
        type: 'orchestrator.provision',
        ...payload,
    };
    // Use stderr so we don't interfere with the single JSON success line on stdout
    console.error(JSON.stringify(entry));
}
// Stub for orchestrator.provisioned event
// Later you can replace this with a Kafka producer.send(...)
async function emitProvisionEvent(payload) {
    const event = {
        ts: new Date().toISOString(),
        type: 'orchestrator.provisioned',
        event: payload,
    };
    console.error(JSON.stringify(event));
}
// ---- Provision function ----
async function provisionClientContainer(clientId, serviceType, image, resources, secrets, options) {
    const ns = options?.namespace ?? 'default';
    const correlationId = options?.correlationId ?? `corr-${Date.now()}`;
    const orgId = options?.orgId ?? 'unknown-org';
    const name = `agentary-${clientId}-${serviceType}`.toLowerCase();
    const { apps, core } = makeK8sClients();
    const secretName = `${name}-vault-ref`;
    // Base metadata reused in success/failure audit/event
    const baseAudit = {
        tenantId: clientId,
        serviceType,
        namespace: ns,
        deploymentName: name,
        secretName,
        correlationId,
    };
    try {
        // 0) Ensure namespace exists
        await ensureNamespace(core, ns);
        // 1) Secret contains ONLY a broker/Vault reference (no plaintext creds)
        const secretBody = {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: {
                name: secretName,
                namespace: ns,
                labels: {
                    tenant_id: clientId,
                    service_type: serviceType,
                },
                annotations: {
                    'agentary.io/credential-broker': 'true',
                    'agentary.io/vault-ref': secrets.vaultRef,
                },
            },
            stringData: { vault_ref: secrets.vaultRef },
            type: 'Opaque',
        };
        // Upsert the Secret (avoids 409 on create)
        await upsertSecret(core, ns, secretName, secretBody);
        // 2) Build env vars (ORG_ID, CORRELATION_ID; VAULT_REF from secret; plus overrides)
        const baseEnv = [
            { name: 'ORG_ID', value: orgId },
            { name: 'CORRELATION_ID', value: correlationId },
            {
                name: 'VAULT_REF',
                valueFrom: {
                    secretKeyRef: {
                        name: secretName,
                        key: 'vault_ref',
                    },
                },
            },
        ];
        const extraEnv = Object.entries(options?.envOverrides ?? {}).map(([k, v]) => ({
            name: k,
            value: v,
        }));
        const env = [...baseEnv, ...extraEnv];
        // 3) Desired Deployment (full manifest)
        const deploy = {
            apiVersion: 'apps/v1',
            kind: 'Deployment',
            metadata: {
                name,
                namespace: ns,
                labels: {
                    tenant_id: clientId,
                    service_type: serviceType,
                    billing_enabled: 'true',
                },
                annotations: {
                    'agentary.io/correlation-id': correlationId,
                },
            },
            spec: {
                replicas: 1,
                selector: {
                    matchLabels: {
                        app: name,
                        tenant_id: clientId,
                        service_type: serviceType,
                    },
                },
                template: {
                    metadata: {
                        labels: {
                            app: name,
                            tenant_id: clientId,
                            service_type: serviceType,
                        },
                        annotations: {
                            'agentary.io/credential-broker': 'true',
                            'agentary.io/correlation-id': correlationId,
                        },
                    },
                    spec: {
                        // R-002 will add initContainers for artifact fetch/verify
                        containers: [
                            {
                                name: 'app',
                                image,
                                env,
                                resources: {
                                    requests: { cpu: resources.cpu, memory: resources.memory },
                                    limits: { cpu: resources.cpu, memory: resources.memory },
                                },
                                volumeMounts: [
                                    { name: 'vault-ref', mountPath: '/var/run/agentary/secret', readOnly: true },
                                ],
                            },
                        ],
                        volumes: [{ name: 'vault-ref', secret: { secretName } }],
                    },
                },
            },
        };
        // 4) Upsert Deployment (replace if exists, preserving resourceVersion)
        try {
            const readResp = await apps.readNamespacedDeployment({ name, namespace: ns });
            const existing = unwrap(readResp);
            const resourceVersion = existing?.metadata?.resourceVersion;
            const updated = JSON.parse(JSON.stringify(deploy));
            updated.metadata = updated.metadata ?? {};
            if (resourceVersion) {
                updated.metadata.resourceVersion = resourceVersion;
            }
            await apps.replaceNamespacedDeployment({ name, namespace: ns, body: updated });
        }
        catch (e) {
            const status = statusCodeOf(e);
            if (status === 404) {
                await apps.createNamespacedDeployment({ namespace: ns, body: deploy });
            }
            else {
                throw e;
            }
        }
        // 5) Wait for readiness
        await waitForDeploymentReady(apps, ns, name);
        // 6) Success: audit + event + return details
        const result = {
            namespace: ns,
            name,
            secretName,
            correlationId,
        };
        const successPayload = {
            ...baseAudit,
            status: 'success',
            error: null,
        };
        auditProvision(successPayload);
        await emitProvisionEvent(successPayload);
        return result;
    }
    catch (e) {
        const message = e?.message ?? String(e);
        const failurePayload = {
            ...baseAudit,
            status: 'failure',
            error: message,
        };
        auditProvision(failurePayload);
        await emitProvisionEvent(failurePayload);
        throw e;
    }
}
// ---- Direct run (prints a single JSON line) ----
const invokedPath = process.argv[1] || '';
const isDirectRun = invokedPath.endsWith('provisioner.ts') ||
    invokedPath.endsWith('provisioner.tsx') ||
    invokedPath.endsWith('provisioner.js');
if (isDirectRun) {
    (async () => {
        try {
            const result = await provisionClientContainer('tenant-123', 'myservice', 'nginx:1.25', { cpu: '100m', memory: '128Mi' }, { vaultRef: 'vault://secret/drivers/driver-abc/tenant-123/conn-001' }, { namespace: 'default', orgId: 'org-xyz', envOverrides: { EXAMPLE_FLAG: 'true' } });
            // Single JSON line on stdout
            console.log(JSON.stringify({ Provisioned: result }));
        }
        catch (e) {
            console.error(`Provisioning failed: ${e?.message ?? e}`);
            process.exit(1);
        }
    })();
}
