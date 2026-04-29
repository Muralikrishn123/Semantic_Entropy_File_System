/**
 * SEFS API Service
 * ================
 * Centralized service for all REST API interactions and connection monitoring.
 */

const API_BASE = '/api';

export interface BackendHealth {
    status: string;
    uptime: number;
    timestamp: string;
    documentsCount: number;
    watcherActive: boolean;
    watchDir: string;
}

export interface BackendStatus {
    connected: boolean;
    lastChecked: string;
    data?: BackendHealth;
    error?: string;
}

class ApiService {
    private status: BackendStatus = {
        connected: false,
        lastChecked: new Date().toISOString()
    };

    /**
     * Check backend health
     */
    async checkHealth(): Promise<BackendStatus> {
        try {
            const res = await fetch(`${API_BASE}/health`, {
                method: 'GET',
                cache: 'no-store'
            });

            if (!res.ok) throw new Error(`HTTP Error ${res.status}`);

            const data = await res.json();
            this.status = {
                connected: true,
                lastChecked: new Date().toISOString(),
                data
            };
        } catch (err: any) {
            this.status = {
                connected: false,
                lastChecked: new Date().toISOString(),
                error: err.message
            };
        }
        return this.status;
    }

    getStatus(): BackendStatus {
        return this.status;
    }

    /**
     * Fetch all documents
     */
    async getDocuments() {
        const res = await fetch(`${API_BASE}/documents`);
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to fetch documents');
        }
        return res.json();
    }

    /**
     * Fetch clusters
     */
    async getClusters() {
        const res = await fetch(`${API_BASE}/clusters`);
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to fetch clusters');
        }
        return res.json();
    }

    /**
     * Fetch stats
     */
    async getStats() {
        const res = await fetch(`${API_BASE}/stats`);
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to fetch stats');
        }
        return res.json();
    }

    /**
     * Batch upload documents
     */
    async uploadBatch(documents: { name: string; content: string }[]) {
        const res = await fetch(`${API_BASE}/documents/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documents })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to upload documents');
        }
        return res.json();
    }

    /**
     * Delete all documents
     */
    async clearAll() {
        const res = await fetch(`${API_BASE}/documents`, { method: 'DELETE' });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to clear documents');
        }
        return res.json();
    }

    /**
     * Delete a single document
     */
    async removeDocument(id: string) {
        const res = await fetch(`${API_BASE}/documents/${id}`, { method: 'DELETE' });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to remove document');
        }
        return res.json();
    }

    /**
     * Toggle folder watcher
     */
    async toggleWatcher(active: boolean) {
        const action = active ? 'stop' : 'start';
        const res = await fetch(`${API_BASE}/watcher/${action}`, { method: 'POST' });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Failed to ${action} watcher`);
        }
        return res.json();
    }

    /**
     * Get watcher status
     */
    async getWatcherStatus() {
        const res = await fetch(`${API_BASE}/watcher/status`);
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to get watcher status');
        }
        return res.json();
    }

    /**
     * Recalculate layout
     */
    async recalculateLayout() {
        const res = await fetch(`${API_BASE}/layout/recalculate`, { method: 'POST' });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to recalculate layout');
        }
        return res.json();
    }

    /**
     * Chat assistant
     */
    async chat(query: string, state: any) {
        const res = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, state })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Chat failed');
        }
        return res.json();
    }
}

export const api = new ApiService();
