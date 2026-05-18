/**
 * Fleet Apex Offline Database Engine  —  RUN 5
 * ──────────────────────────────────────────────────────────────────────────
 * Provides a fully offline-capable, IndexedDB-backed data layer that:
 *   1. Replaces raw localStorage for all fleet entity data
 *   2. Queues every write/delete when offline as a sync operation
 *   3. Drains the queue when connectivity is restored (background sync)
 *   4. Resolves conflicts with Last-Write-Wins + server-wins override
 *   5. Broadcasts data changes to all open tabs via BroadcastChannel
 *   6. Exposes FleetDB — a drop-in API matching the existing lsGet/lsSet pattern
 *
 * Entity stores:
 *   vehicles · drivers · hazards · messages · trips · gps_positions
 *   live_routes · dispatch · driver_status · fleet_config · sync_queue
 *
 * All writes go through FleetDB.put(store, record) — never directly to IDB.
 * ──────────────────────────────────────────────────────────────────────────
 */
(function(global) {
  'use strict';

  // ── Constants ───────────────────────────────────────────────────────────────
  const DB_NAME    = 'fleet_apex_db';
  const DB_VERSION = 1;
  const BC_CHANNEL = 'fleet_apex_db_v1';

  // Store definitions: name → keyPath
  const STORES = {
    vehicles:      { keyPath: 'id',        indexes: ['reg', 'status', 'driverId'] },
    drivers:       { keyPath: 'id',        indexes: ['name', 'status', 'vehicleId'] },
    hazards:       { keyPath: 'id',        indexes: ['type', 'status', 'ts', 'driverId'] },
    messages:      { keyPath: 'id',        indexes: ['ts', 'fromId', 'toId', 'channel'] },
    trips:         { keyPath: 'id',        indexes: ['driverId', 'vehicleId', 'startTs', 'status'] },
    gps_positions: { keyPath: 'driverId',  indexes: ['ts', 'vehicleId'] },
    live_routes:   { keyPath: 'id',        indexes: ['driverId', 'vehicleId', 'ts'] },
    dispatch:      { keyPath: 'id',        indexes: ['driverId', 'ts', 'status'] },
    driver_status: { keyPath: 'driverId',  indexes: ['status', 'ts'] },
    fleet_config:  { keyPath: 'key',       indexes: [] },
    sync_queue:    { keyPath: 'queueId',   autoIncrement: true, indexes: ['store', 'status', 'ts', 'op'] },
  };

  // Sync operations
  const OP_PUT    = 'put';
  const OP_DELETE = 'delete';
  const SQ_PENDING  = 'pending';
  const SQ_INFLIGHT = 'inflight';
  const SQ_DONE     = 'done';
  const SQ_CONFLICT = 'conflict';

  // ── State ────────────────────────────────────────────────────────────────────
  let _db         = null;
  let _dbReady    = false;
  let _dbQueue    = [];        // callbacks waiting for DB to open
  let _bc         = null;      // BroadcastChannel
  let _online     = navigator.onLine;
  let _syncActive = false;
  let _listeners  = {};        // store → [callbacks]
  let _supabase   = null;      // injected later by supabaseConnect()

  // ── Open / upgrade database ──────────────────────────────────────────────────
  function _openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        Object.entries(STORES).forEach(([name, def]) => {
          if (db.objectStoreNames.contains(name)) return;
          const opts = { keyPath: def.keyPath };
          if (def.autoIncrement) opts.autoIncrement = true;
          const store = db.createObjectStore(name, opts);
          (def.indexes || []).forEach(idx => {
            store.createIndex(idx, idx, { unique: false });
          });
        });
        console.log('[FleetDB] Schema upgraded to v' + DB_VERSION);
      };

      req.onsuccess = (e) => {
        _db = e.target.result;
        _dbReady = true;
        _db.onversionchange = () => { _db.close(); _dbReady = false; };
        _dbQueue.forEach(cb => cb(_db));
        _dbQueue = [];
        console.log('[FleetDB] Database ready — ' + DB_NAME + ' v' + DB_VERSION);
        resolve(_db);
      };

      req.onerror = (e) => {
        console.error('[FleetDB] Open failed:', e.target.error);
        reject(e.target.error);
      };

      req.onblocked = () => {
        console.warn('[FleetDB] Blocked — close other tabs');
      };
    });
  }

  function _withDB(fn) {
    if (_dbReady && _db) return fn(_db);
    return new Promise((resolve, reject) => {
      _dbQueue.push((db) => {
        try { resolve(fn(db)); } catch(e) { reject(e); }
      });
    });
  }

  // ── Core IDB helpers ─────────────────────────────────────────────────────────
  function _tx(storeName, mode, fn) {
    return _withDB(db => new Promise((resolve, reject) => {
      const tx    = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const req   = fn(store);
      if (req && req.onsuccess !== undefined) {
        req.onsuccess  = (e) => resolve(e.target.result);
        req.onerror    = (e) => reject(e.target.error);
      } else {
        tx.oncomplete  = () => resolve();
        tx.onerror     = (e) => reject(e.target.error);
      }
    }));
  }

  function _idbGet(store, key) {
    return _tx(store, 'readonly', s => s.get(key));
  }

  function _idbGetAll(store, indexName, value) {
    return _withDB(db => new Promise((resolve, reject) => {
      const tx  = db.transaction(store, 'readonly');
      const os  = tx.objectStore(store);
      let req;
      if (indexName && value !== undefined) {
        req = os.index(indexName).getAll(value);
      } else {
        req = os.getAll();
      }
      req.onsuccess = (e) => resolve(e.target.result || []);
      req.onerror   = (e) => reject(e.target.error);
    }));
  }

  function _idbPut(store, record) {
    return _tx(store, 'readwrite', s => s.put(record));
  }

  function _idbDelete(store, key) {
    return _tx(store, 'readwrite', s => s.delete(key));
  }

  function _idbClear(store) {
    return _tx(store, 'readwrite', s => s.clear());
  }

  // ── BroadcastChannel setup ───────────────────────────────────────────────────
  function _initBC() {
    if (!window.BroadcastChannel) return;
    _bc = new BroadcastChannel(BC_CHANNEL);
    _bc.onmessage = (e) => {
      const { type, store, record, key } = e.data || {};
      if (type === 'db_change') _notifyListeners(store, 'external', record, key);
      if (type === 'sync_complete') _notifySyncListeners();
      if (type === 'online_change') { _online = e.data.online; _maybeDrainQueue(); }
    };
  }

  function _bcBroadcast(payload) {
    if (_bc) { try { _bc.postMessage(payload); } catch(e) {} }
  }

  // ── Change listeners ─────────────────────────────────────────────────────────
  function _notifyListeners(store, source, record, key) {
    (_listeners[store] || []).forEach(cb => {
      try { cb({ store, source, record, key }); } catch(e) {}
    });
    (_listeners['*'] || []).forEach(cb => {
      try { cb({ store, source, record, key }); } catch(e) {}
    });
  }

  function _notifySyncListeners() {
    (_listeners['sync'] || []).forEach(cb => { try { cb(); } catch(e) {} });
  }

  // ── Sync Queue operations ─────────────────────────────────────────────────────
  function _enqueue(op, store, record, key) {
    const entry = {
      op,
      store,
      record:     record ? JSON.parse(JSON.stringify(record)) : null,
      key:        key || (record && record[STORES[store]?.keyPath]),
      ts:         Date.now(),
      status:     SQ_PENDING,
      retries:    0,
      clientId:   _getClientId(),
    };
    return _idbPut('sync_queue', entry);
  }

  async function _drainQueue() {
    if (_syncActive || !_online) return;
    if (!_supabase) return; // no cloud endpoint yet
    _syncActive = true;

    try {
      const queue = await _idbGetAll('sync_queue');
      const pending = queue.filter(q => q.status === SQ_PENDING || q.status === SQ_CONFLICT);
      if (!pending.length) { _syncActive = false; return; }

      console.log(`[FleetDB Sync] Draining ${pending.length} queued operations`);

      for (const entry of pending) {
        // Mark inflight
        entry.status = SQ_INFLIGHT;
        await _idbPut('sync_queue', entry);

        try {
          let result;
          if (entry.op === OP_PUT) {
            result = await _syncPutToSupabase(entry.store, entry.record);
          } else if (entry.op === OP_DELETE) {
            result = await _syncDeleteFromSupabase(entry.store, entry.key);
          }

          if (result.conflict) {
            // Conflict: server record is newer — resolve with server data
            const serverRecord = result.serverRecord;
            await _idbPut(entry.store, serverRecord);
            entry.status = SQ_DONE;
            entry.resolvedWith = 'server';
            _notifyListeners(entry.store, 'conflict_resolved', serverRecord, entry.key);
            _bcBroadcast({ type:'db_change', store:entry.store, record:serverRecord, key:entry.key });
            console.log(`[FleetDB Sync] Conflict resolved (server wins): ${entry.store}/${entry.key}`);
          } else {
            // Success — merge server timestamps back
            if (result.data && entry.op === OP_PUT) {
              const merged = Object.assign({}, entry.record, {
                _synced_at: result.data.updated_at || Date.now(),
                _server_id: result.data.id || entry.key,
              });
              await _idbPut(entry.store, merged);
              _notifyListeners(entry.store, 'sync_merged', merged, entry.key);
            }
            entry.status = SQ_DONE;
          }
          await _idbPut('sync_queue', entry);

        } catch(err) {
          entry.status  = SQ_PENDING;
          entry.retries = (entry.retries || 0) + 1;
          entry.lastErr = err.message;
          await _idbPut('sync_queue', entry);
          console.warn(`[FleetDB Sync] Failed (retry ${entry.retries}):`, err.message);

          // Back off on repeated failures
          if (entry.retries >= 5) {
            entry.status = SQ_CONFLICT;
            await _idbPut('sync_queue', entry);
          }
        }
      }

      // Prune old DONE entries (keep last 200)
      const allDone = (await _idbGetAll('sync_queue')).filter(q => q.status === SQ_DONE);
      if (allDone.length > 200) {
        const toDelete = allDone.slice(0, allDone.length - 200);
        for (const d of toDelete) await _idbDelete('sync_queue', d.queueId);
      }

      _bcBroadcast({ type:'sync_complete' });
      _notifySyncListeners();
      console.log('[FleetDB Sync] Drain complete');
    } finally {
      _syncActive = false;
    }
  }

  async function _syncPutToSupabase(store, record) {
    if (!_supabase) return { conflict: false, data: null };
    try {
      const { data, error } = await _supabase
        .from(store)
        .upsert(record, { onConflict: 'id', ignoreDuplicates: false })
        .select()
        .single();

      if (error) {
        // Check if server record is newer (conflict)
        if (error.code === '23505' || error.message?.includes('conflict')) {
          const { data: serverRecord } = await _supabase.from(store).select('*').eq('id', record.id).single();
          if (serverRecord && serverRecord.updated_at > (record.updated_at || 0)) {
            return { conflict: true, serverRecord };
          }
        }
        throw new Error(error.message);
      }
      return { conflict: false, data };
    } catch(e) {
      throw e;
    }
  }

  async function _syncDeleteFromSupabase(store, key) {
    if (!_supabase) return { conflict: false };
    const { error } = await _supabase.from(store).delete().eq('id', key);
    if (error) throw new Error(error.message);
    return { conflict: false };
  }

  function _maybeDrainQueue() {
    if (_online && _supabase) {
      setTimeout(_drainQueue, 500);
    }
  }

  // ── Client ID (unique per device/browser) ────────────────────────────────────
  function _getClientId() {
    let id = localStorage.getItem('fa_client_id');
    if (!id) {
      id = 'fa-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      localStorage.setItem('fa_client_id', id);
    }
    return id;
  }

  // ── Timestamp helpers ────────────────────────────────────────────────────────
  function _now() { return Date.now(); }
  function _uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // ── Migrate existing localStorage data ───────────────────────────────────────
  async function _migrateFromLS() {
    const migKey = 'fa_idb_migrated_v1';
    if (localStorage.getItem(migKey)) return; // already done

    console.log('[FleetDB] Migrating localStorage data to IndexedDB...');
    const LS_MAP = {
      'fa_vehicles':      'vehicles',
      'fa_drivers':       'drivers',
      'fa_hazards':       'hazards',
      'fa_messages':      'messages',
      'fa_trip_log':      'trips',
      'fa_gps_positions': 'gps_positions',
      'fa_live_routes':   'live_routes',
      'fa_dispatch':      'dispatch',
      'fa_driver_status': 'driver_status',
    };

    for (const [lsKey, store] of Object.entries(LS_MAP)) {
      try {
        const raw = localStorage.getItem(lsKey);
        if (!raw) continue;
        const data = JSON.parse(raw);
        const records = Array.isArray(data) ? data : Object.entries(data).map(([k,v]) => ({ id:k, ...v }));
        for (const rec of records) {
          if (!rec.id) rec.id = _uuid();
          rec._migrated_at = _now();
          await _idbPut(store, rec);
        }
        console.log(`[FleetDB] Migrated ${records.length} records: ${lsKey} → ${store}`);
      } catch(e) {
        console.warn(`[FleetDB] Migration failed for ${lsKey}:`, e.message);
      }
    }

    // Fleet config
    const cfgKeys = ['fa_fleet_config','fa_api_keys','fa_vehicle_ext','fa_trip_inputs'];
    for (const k of cfgKeys) {
      try {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        await _idbPut('fleet_config', { key: k, value: JSON.parse(raw), migratedAt: _now() });
      } catch(e) {}
    }

    localStorage.setItem(migKey, '1');
    console.log('[FleetDB] Migration complete');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PUBLIC API — window.FleetDB
  // ═══════════════════════════════════════════════════════════════════════════
  const FleetDB = {

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    async init(supabaseClient) {
      if (supabaseClient) _supabase = supabaseClient;
      await _openDB();
      _initBC();
      await _migrateFromLS();

      // Network listeners
      window.addEventListener('online',  () => { _online = true;  _maybeDrainQueue(); _bcBroadcast({ type:'online_change', online:true }); });
      window.addEventListener('offline', () => { _online = false; _bcBroadcast({ type:'online_change', online:false }); });

      // Periodic sync every 60s
      setInterval(() => { if (_online && _supabase) _drainQueue(); }, 60000);

      _maybeDrainQueue();
      console.log('[FleetDB] Initialised — online:', _online);
      global.dispatchEvent(new CustomEvent('fa:dbReady', { detail: { online: _online } }));
      return this;
    },

    connectSupabase(client) {
      _supabase = client;
      _maybeDrainQueue();
    },

    // ── Read ──────────────────────────────────────────────────────────────────
    async get(store, key) {
      try { return await _idbGet(store, key); }
      catch(e) { console.warn('[FleetDB] get error:', e); return null; }
    },

    async getAll(store, indexName, value) {
      try { return await _idbGetAll(store, indexName, value); }
      catch(e) { console.warn('[FleetDB] getAll error:', e); return []; }
    },

    async getConfig(key, def = null) {
      try {
        const row = await _idbGet('fleet_config', key);
        return row ? row.value : def;
      } catch(e) { return def; }
    },

    // ── Write ─────────────────────────────────────────────────────────────────
    async put(store, record) {
      if (!record.id && STORES[store]?.keyPath === 'id') record.id = _uuid();
      record._updated_at = _now();
      record._client_id  = _getClientId();

      try {
        await _idbPut(store, record);
        _notifyListeners(store, 'local', record, record[STORES[store]?.keyPath]);
        _bcBroadcast({ type:'db_change', store, record, key: record[STORES[store]?.keyPath] });

        // Queue for background sync
        await _enqueue(OP_PUT, store, record);
        _maybeDrainQueue();
        return record;
      } catch(e) {
        console.error('[FleetDB] put error:', e);
        throw e;
      }
    },

    async putMany(store, records) {
      const results = [];
      for (const rec of records) results.push(await this.put(store, rec));
      return results;
    },

    async setConfig(key, value) {
      const row = { key, value, _updated_at: _now() };
      try {
        await _idbPut('fleet_config', row);
        await _enqueue(OP_PUT, 'fleet_config', row, key);
        return row;
      } catch(e) { console.warn('[FleetDB] setConfig error:', e); }
    },

    // ── Delete ────────────────────────────────────────────────────────────────
    async delete(store, key) {
      try {
        await _idbDelete(store, key);
        _notifyListeners(store, 'delete', null, key);
        _bcBroadcast({ type:'db_change', store, record:null, key });
        await _enqueue(OP_DELETE, store, null, key);
        _maybeDrainQueue();
      } catch(e) { console.error('[FleetDB] delete error:', e); throw e; }
    },

    async clear(store) {
      try {
        await _idbClear(store);
        _notifyListeners(store, 'clear', null, null);
      } catch(e) { console.error('[FleetDB] clear error:', e); }
    },

    // ── Sync control ──────────────────────────────────────────────────────────
    async sync() { return _drainQueue(); },

    async getPendingCount() {
      const q = await _idbGetAll('sync_queue');
      return q.filter(e => e.status === SQ_PENDING || e.status === SQ_CONFLICT).length;
    },

    async getSyncQueue() { return _idbGetAll('sync_queue'); },

    // ── Change listeners ──────────────────────────────────────────────────────
    on(store, callback) {
      if (!_listeners[store]) _listeners[store] = [];
      _listeners[store].push(callback);
      return () => { _listeners[store] = _listeners[store].filter(c => c !== callback); };
    },

    // ── Status ────────────────────────────────────────────────────────────────
    isOnline()   { return _online; },
    isReady()    { return _dbReady; },
    getClientId(){ return _getClientId(); },

    async getStats() {
      const queue = await _idbGetAll('sync_queue');
      return {
        online:    _online,
        ready:     _dbReady,
        pending:   queue.filter(q => q.status === SQ_PENDING).length,
        inflight:  queue.filter(q => q.status === SQ_INFLIGHT).length,
        conflict:  queue.filter(q => q.status === SQ_CONFLICT).length,
        done:      queue.filter(q => q.status === SQ_DONE).length,
        supabase:  !!_supabase,
        clientId:  _getClientId(),
      };
    },

    // ── Legacy lsGet/lsSet shims (backwards compat) ───────────────────────────
    // These allow existing code to gradually migrate to FleetDB.get/put
    lsShim: {
      get(key, def = null) {
        try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; }
        catch { return def; }
      },
      set(key, val) {
        try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {}
        // Also write through to IDB async (best-effort)
        const storeMap = {
          'fa_vehicles': 'vehicles', 'fa_drivers': 'drivers',
          'fa_hazards': 'hazards',   'fa_messages': 'messages',
          'fa_trip_log': 'trips',    'fa_gps_positions': 'gps_positions',
          'fa_live_routes': 'live_routes', 'fa_dispatch': 'dispatch',
          'fa_driver_status': 'driver_status',
        };
        const store = storeMap[key];
        if (!store || !_dbReady) return;
        const records = Array.isArray(val) ? val : (val && typeof val === 'object' ? [val] : null);
        if (!records) return;
        records.forEach(r => { if (r && r.id) FleetDB.put(store, r).catch(() => {}); });
      },
    },

    // ── Internal utilities (exposed for debugging) ────────────────────────────
    _idb: { get: _idbGet, getAll: _idbGetAll, put: _idbPut, delete: _idbDelete, clear: _idbClear },
    _drainQueue,
    _uuid,
  };

  // Make available globally
  global.FleetDB = FleetDB;

  // Auto-init when DOM is ready (Supabase client injected later via FleetDB.connectSupabase)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => FleetDB.init());
  } else {
    FleetDB.init();
  }

  console.log('[FleetDB] Module loaded');

})(window);
