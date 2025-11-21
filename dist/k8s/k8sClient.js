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
exports.makeK8sClients = makeK8sClients;
exports.waitForDeploymentReady = waitForDeploymentReady;
// src/k8s/k8sClient.ts
const k8s = __importStar(require("@kubernetes/client-node"));
function makeK8sClients() {
    const kc = new k8s.KubeConfig();
    // Try local config first (KUBECONFIG or ~/.kube/config); fall back to in-cluster
    try {
        kc.loadFromDefault();
    }
    catch {
        kc.loadFromCluster();
    }
    const apps = kc.makeApiClient(k8s.AppsV1Api);
    const core = kc.makeApiClient(k8s.CoreV1Api);
    return { kc, apps, core };
}
/**
 * Polls the Deployment until availableReplicas >= spec.replicas or timeout.
 */
async function waitForDeploymentReady(apps, namespace, name, timeoutMs = 180000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        // Newer client-node expects an options object and returns V1Deployment directly
        const dep = await apps.readNamespacedDeployment({
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
