import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;
let openPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  if (openPromise) return openPromise;
  openPromise = (async () => {
    const handle = await SQLite.openDatabaseAsync('lockbox.db');
    await handle.execAsync('PRAGMA journal_mode = WAL');
    await handle.execAsync('PRAGMA foreign_keys = ON');
    await initialize(handle);
    db = handle;
    return handle;
  })();
  try {
    return await openPromise;
  } catch (e) {
    openPromise = null;
    throw e;
  }
}

async function initialize(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS lockboxes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      category TEXT,
      is_locked INTEGER NOT NULL DEFAULT 1,
      unlock_delay_seconds INTEGER NOT NULL DEFAULT 60,
      relock_delay_seconds INTEGER NOT NULL DEFAULT 3600,
      unlock_timestamp INTEGER,
      relock_timestamp INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS access_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lockbox_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (lockbox_id) REFERENCES lockboxes(id) ON DELETE CASCADE
    )
  `);

  await database.execAsync(
    'CREATE INDEX IF NOT EXISTS idx_lockboxes_category ON lockboxes(category)'
  );
  await database.execAsync(
    'CREATE INDEX IF NOT EXISTS idx_access_log_lockbox ON access_log(lockbox_id, timestamp)'
  );

  await migrate(database);
}

async function migrate(database: SQLite.SQLiteDatabase): Promise<void> {
  const result = await database.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  const version = result?.user_version ?? 0;

  if (version < 1) {
    const alterStatements = [
      'ALTER TABLE lockboxes ADD COLUMN reflection_enabled INTEGER NOT NULL DEFAULT 0',
      'ALTER TABLE lockboxes ADD COLUMN reflection_message TEXT',
      'ALTER TABLE lockboxes ADD COLUMN reflection_checklist TEXT',
      'ALTER TABLE lockboxes ADD COLUMN penalty_enabled INTEGER NOT NULL DEFAULT 0',
      'ALTER TABLE lockboxes ADD COLUMN penalty_seconds INTEGER NOT NULL DEFAULT 0',
      'ALTER TABLE lockboxes ADD COLUMN panic_code_hash TEXT',
      'ALTER TABLE lockboxes ADD COLUMN panic_code_used INTEGER NOT NULL DEFAULT 0',
      'ALTER TABLE lockboxes ADD COLUMN scheduled_unlock_at INTEGER',
    ];
    for (const stmt of alterStatements) {
      try {
        await database.execAsync(stmt);
      } catch {
        // Column may already exist
      }
    }
    await database.execAsync('PRAGMA user_version = 1');
  }

  if (version < 2) {
    try {
      await database.execAsync('ALTER TABLE lockboxes ADD COLUMN tags TEXT');
    } catch {
      // Column may already exist
    }
    await database.execAsync('PRAGMA user_version = 2');
  }
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
    openPromise = null;
  }
}
