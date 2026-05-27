"""
Migration script: adds stash_inventory and stash_log_imports tables.

Run with: python -m scripts.migrate_inventory
"""

import logging
import sqlite3

from backend import DB_PATH, LOG_LEVEL, LOG_FORMAT

logging.basicConfig(level=getattr(logging, LOG_LEVEL), format=LOG_FORMAT)
logger = logging.getLogger(__name__)


def migrate(conn: sqlite3.Connection) -> None:
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS stash_log_imports (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            raw_text   TEXT NOT NULL,
            imported_at DATETIME NOT NULL DEFAULT (datetime('now')),
            lines_parsed INTEGER NOT NULL DEFAULT 0,
            items_found  INTEGER NOT NULL DEFAULT 0,
            notes        TEXT
        );

        CREATE TABLE IF NOT EXISTS stash_inventory (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            item_name   TEXT NOT NULL COLLATE NOCASE,
            item_id     INTEGER REFERENCES items(id) ON DELETE SET NULL,
            quantity    INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
            last_import_id INTEGER REFERENCES stash_log_imports(id) ON DELETE SET NULL,
            updated_at  DATETIME NOT NULL DEFAULT (datetime('now'))
        );

        CREATE UNIQUE INDEX IF NOT EXISTS uq_stash_item_name
            ON stash_inventory (item_name COLLATE NOCASE);
    """)
    logger.info("stash_inventory and stash_log_imports tables created (or already exist).")


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = OFF")
    try:
        migrate(conn)
        conn.commit()
        print("Migration complete.")
    except Exception as e:
        conn.rollback()
        logger.error(f"Migration failed: {e}")
        raise
    finally:
        conn.execute("PRAGMA foreign_keys = ON")
        conn.close()


if __name__ == "__main__":
    main()
