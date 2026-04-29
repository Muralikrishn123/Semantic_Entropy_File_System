/**
 * FolderWatcher - File System Auto-Detection
 * =============================================
 * Uses chokidar to watch a directory for new file additions.
 * Emits events when files are added, changed, or removed.
 */

import chokidar from 'chokidar';
import path from 'path';
import { EventEmitter } from 'events';

const SUPPORTED_EXTENSIONS = new Set([
  '.txt', '.pdf', '.md', '.csv', '.json', '.html',
  '.xml', '.log', '.doc', '.rtf', '.tex'
]);

export class FolderWatcher extends EventEmitter {
  /**
   * @param {string} watchDir - Default directory to watch
   */
  constructor(watchDir) {
    super();
    this.watchDir = watchDir;
    this.watcher = null;
    this.active = false;
    this.processedFiles = new Set();
    this.detectedCount = 0;
    this.processedCount = 0;
    this.startedAt = null;
    this.log = [];
  }

  /**
   * Start watching a directory
   * @param {string} [dir] - Directory to watch (overrides default)
   */
  start(dir) {
    if (this.active) {
      this.stop();
    }

    const watchDir = dir || this.watchDir;
    this.watchDir = watchDir;
    this.active = true;
    this.startedAt = new Date().toISOString();

    this._addLog(`Watcher started - monitoring: ${watchDir}`);

    this.watcher = chokidar.watch(watchDir, {
      ignored: /(^|[\/\\])\../, // ignore hidden files
      persistent: true,
      ignoreInitial: false,      // Process existing files on startup
      awaitWriteFinish: {
        stabilityThreshold: 1000, // Wait 1 second after last write
        pollInterval: 100
      },
      depth: 3                   // Watch up to 3 levels deep
    });

    this.watcher
      .on('add', (filePath) => this._handleFileAdded(filePath))
      .on('change', (filePath) => this._handleFileChanged(filePath))
      .on('unlink', (filePath) => this._handleFileRemoved(filePath))
      .on('error', (error) => {
        console.error('[Watcher] Error:', error.message);
        this._addLog(`Error: ${error.message}`);
        this.emit('error', error);
      })
      .on('ready', () => {
        console.log(`[Watcher] Ready - watching: ${watchDir}`);
        this._addLog('Watcher ready');
        this.emit('status', this.getStatus());
      });

    this.emit('status', this.getStatus());
  }

  /**
   * Stop watching
   */
  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    this.active = false;
    this._addLog('Watcher stopped');
    this.emit('status', this.getStatus());
    console.log('[Watcher] Stopped');
  }

  /**
   * Check if watcher is active
   * @returns {boolean}
   */
  isActive() {
    return this.active;
  }

  /**
   * Get current watcher status
   * @returns {Object}
   */
  getStatus() {
    return {
      active: this.active,
      directory: this.watchDir,
      detectedCount: this.detectedCount,
      processedCount: this.processedCount,
      startedAt: this.startedAt,
      recentLog: this.log.slice(-10)
    };
  }

  /**
   * Handle a new file being added
   * @private
   */
  _handleFileAdded(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const name = path.basename(filePath);

    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      this._addLog(`Skipped (unsupported type): ${name}`);
      return;
    }

    if (this.processedFiles.has(filePath)) {
      return; // Already processed
    }

    this.processedFiles.add(filePath);
    this.detectedCount++;

    this._addLog(`📄 Detected: ${name}`);
    console.log(`[Watcher] File detected: ${name}`);

    this.emit('file:detected', { name, filePath, ext });
  }

  /**
   * Handle file modification
   * @private
   */
  _handleFileChanged(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const name = path.basename(filePath);

    if (!SUPPORTED_EXTENSIONS.has(ext)) return;

    this._addLog(`📝 Modified: ${name}`);
    console.log(`[Watcher] File changed: ${name}`);

    // Re-emit as a detected file for reprocessing
    this.emit('file:detected', { name, filePath, ext, isUpdate: true });
  }

  /**
   * Handle file removal
   * @private
   */
  _handleFileRemoved(filePath) {
    const name = path.basename(filePath);
    this.processedFiles.delete(filePath);

    this._addLog(`🗑️ Removed: ${name}`);
    console.log(`[Watcher] File removed: ${name}`);

    this.emit('file:removed', { name, filePath });
  }

  /**
   * Add entry to internal log
   * @private
   */
  _addLog(message) {
    const timestamp = new Date().toLocaleTimeString();
    this.log.push(`[${timestamp}] ${message}`);
    if (this.log.length > 50) {
      this.log = this.log.slice(-30);
    }
  }
}
