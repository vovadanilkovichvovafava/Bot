/**
 * Replay Recorder — captures rrweb DOM snapshots for session replay.
 *
 * Buffers rrweb events and flushes them every 20s to POST /analytics/replay,
 * sharing the session_id with the analytics tracker. Inputs are masked,
 * size is capped at 2MB/session. Replayed via rrweb-player in the admin panel.
 */

import { ENV } from '../config/env';

const FLUSH_INTERVAL = 20_000; // 20s
const MAX_SIZE = 2 * 1024 * 1024; // 2MB client-side cap

function getToken() {
  try { return localStorage.getItem('access_token'); } catch { return null; }
}

class ReplayRecorder {
  constructor() {
    this.stopFn = null;
    this.buffer = [];
    this.flushTimer = null;
    this.sessionId = null;
    this.totalSize = 0;
    this.capped = false;
    this._fullSnapshotSent = false;
    this._boundLeave = null;
  }

  /** Start rrweb recording. @param {string} sessionId shared analytics session id */
  init(sessionId) {
    if (this.stopFn || !sessionId) return;
    this.sessionId = sessionId;
    this.buffer = [];
    this.totalSize = 0;
    this.capped = false;
    this._fullSnapshotSent = false;

    // Dynamic import keeps rrweb out of the main bundle
    import('rrweb').then(({ record }) => {
      if (this.capped) return;
      this.stopFn = record({
        emit: (event) => this._onEvent(event),
        maskAllInputs: true,
        blockClass: 'rr-block',
        sampling: { mousemove: 50, mouseInteraction: true, scroll: 150, input: 'last' },
        recordCanvas: false,
        recordCrossOriginIframes: false,
        inlineStylesheet: true,
        slimDOMOptions: {
          script: true, comment: true, headFavicon: true, headWhitespace: true,
          headMetaDescKeywords: true, headMetaSocial: true, headMetaRobots: true,
          headMetaHttpEquiv: true, headMetaAuthorship: true, headMetaVerif: true,
        },
      });

      this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL);
      this._boundLeave = () => this._onLeave();
      window.addEventListener('pagehide', this._boundLeave);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') this._onLeave();
      });
    }).catch(() => { /* rrweb failed to load — silently skip */ });
  }

  _onEvent(event) {
    if (this.capped) return;
    try { this.totalSize += JSON.stringify(event).length; } catch { this.totalSize += 500; }
    this.buffer.push(event);

    // FullSnapshot (type 2) is critical — flush immediately
    if (event.type === 2 && !this._fullSnapshotSent) {
      this._fullSnapshotSent = true;
      this.flush(false);
      return;
    }
    if (this.totalSize >= MAX_SIZE) {
      this.capped = true;
      this.flush(true);
      if (this.stopFn) { this.stopFn(); this.stopFn = null; }
    }
  }

  flush(isFinal = false) {
    if (!this.buffer.length || !this.sessionId) return;
    const events = this.buffer.splice(0);
    const payload = JSON.stringify({ session_id: this.sessionId, events, is_final: isFinal });
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    // No keepalive here (64KB body limit too small for FullSnapshot).
    try {
      fetch(`${ENV.API_URL}/analytics/replay`, { method: 'POST', headers, body: payload }).catch(() => {});
    } catch { /* never affect UX */ }
  }

  _onLeave() {
    if (!this.buffer.length || !this.sessionId) return;
    const events = this.buffer.splice(0);
    const payload = JSON.stringify({ session_id: this.sessionId, events, is_final: true });
    const url = `${ENV.API_URL}/analytics/replay`;
    const token = getToken();
    try {
      const blob = new Blob([payload], { type: 'application/json' });
      const sent = navigator.sendBeacon(url, blob);
      if (!sent) {
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch { /* last resort */ }
  }

  destroy() {
    if (this.stopFn) { this.stopFn(); this.stopFn = null; }
    if (this.flushTimer) { clearInterval(this.flushTimer); this.flushTimer = null; }
    if (this._boundLeave) { window.removeEventListener('pagehide', this._boundLeave); this._boundLeave = null; }
    this.flush(true);
    this.buffer = [];
    this.sessionId = null;
  }
}

const replayRecorder = new ReplayRecorder();
export default replayRecorder;
