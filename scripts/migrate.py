"""
Database schema migration script.

Creates a backup, then migrates all tables with proper constraints and indexes.
If migration fails, the database is rolled back to its original state.
"""

import logging
import shutil
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

from backend import DB_PATH, LOG_LEVEL, LOG_FORMAT

# Configure logging
logging.basicConfig(level=getattr(logging, LOG_LEVEL), format=LOG_FORMAT)
logger = logging.getLogger(__name__)


def create_backup() -> str:
    """Create a timestamped backup of the database."""
    backup_name = f'tibia_data_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.db'
    try:
        shutil.copy(DB_PATH, backup_name)
        logger.info(f"Backup created: {backup_name}")
        print(f"Backup created: {backup_name}")
        return backup_name
    except Exception as e:
        logger.error(f"Failed to create backup: {e}")
        raise

def get_connection():
    """Get a database connection with foreign keys disabled for migration."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = OFF")
    return conn


def migrate_items(conn: sqlite3.Connection) -> None:
    """Migrate the items table with constraints."""
    logger.info("Migrating items table...")
    conn.executescript("""
        ALTER TABLE items RENAME TO items_old;

        CREATE TABLE items (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            tier INTEGER CHECK (tier >= 0),
            wiki_name TEXT,
            best_npc_sell_price INTEGER CHECK (best_npc_sell_price >= 0),
            best_npc_sell_npcs TEXT,
            best_npc_buy_price INTEGER CHECK (best_npc_buy_price >= 0),
            best_npc_buy_npcs TEXT
        );

        INSERT INTO items (id, name, category, tier, wiki_name, best_npc_sell_price, best_npc_sell_npcs, best_npc_buy_price, best_npc_buy_npcs)
        SELECT id, name, category, tier, wiki_name, best_npc_sell_price,
            CASE WHEN best_npc_sell_npcs = '[]' THEN NULL ELSE best_npc_sell_npcs END,
            best_npc_buy_price,
            CASE WHEN best_npc_buy_npcs = '[]' THEN NULL ELSE best_npc_buy_npcs END
        FROM items_old;
        DROP TABLE items_old;
    """)
    print("✓ items table migrated")


def migrate_servers(conn: sqlite3.Connection) -> None:
    """Migrate the servers table with constraints."""
    logger.info("Migrating servers table...")
    conn.executescript("""
        ALTER TABLE servers RENAME TO servers_old;

        CREATE TABLE servers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            region TEXT NOT NULL,
            pvp_type TEXT NOT NULL,
            battleye TEXT,
            notes TEXT,
            release_date TEXT,
            market_last_fetch TIMESTAMP,
            api_last_update TEXT
        );

        INSERT INTO servers SELECT * FROM servers_old;
        DROP TABLE servers_old;
    """)
    print("✓ servers table migrated")


def migrate_market_current(conn: sqlite3.Connection) -> None:
    """Migrate the market_current table with constraints and foreign keys."""
    logger.info("Migrating market_current table...")
    conn.executescript("""
        ALTER TABLE market_current RENAME TO market_current_old;

        CREATE TABLE market_current (
            item_id INTEGER NOT NULL,
            server_id INTEGER NOT NULL,
            time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            buy_offer INTEGER NOT NULL DEFAULT 0 CHECK (buy_offer >= 0),
            sell_offer INTEGER NOT NULL DEFAULT 0 CHECK (sell_offer >= 0),
            buy_offers INTEGER NOT NULL DEFAULT 0 CHECK (buy_offers >= 0),
            sell_offers INTEGER NOT NULL DEFAULT 0 CHECK (sell_offers >= 0),
            PRIMARY KEY (item_id, server_id),
            FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
            FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
        );

        INSERT INTO market_current SELECT * FROM market_current_old;
        DROP TABLE market_current_old;
    """)
    print("✓ market_current table migrated")


def migrate_market_history(conn: sqlite3.Connection) -> None:
    """Migrate the market_history table with constraints and foreign keys."""
    logger.info("Migrating market_history table...")
    conn.executescript("""
        ALTER TABLE market_history RENAME TO market_history_old;

        CREATE TABLE market_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id INTEGER NOT NULL,
            server_id INTEGER NOT NULL,
            time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            buy_offer INTEGER NOT NULL DEFAULT 0 CHECK (buy_offer >= 0),
            sell_offer INTEGER NOT NULL DEFAULT 0 CHECK (sell_offer >= 0),
            buy_offers INTEGER NOT NULL DEFAULT 0 CHECK (buy_offers >= 0),
            sell_offers INTEGER NOT NULL DEFAULT 0 CHECK (sell_offers >= 0),
            FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
            FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
        );

        INSERT INTO market_history SELECT * FROM market_history_old;
        DROP TABLE market_history_old;
    """)
    print("✓ market_history table migrated")


def create_indexes(conn: sqlite3.Connection) -> None:
    """Create performance indexes."""
    logger.info("Creating indexes...")
    conn.executescript("""
        CREATE INDEX IF NOT EXISTS idx_market_history_item_time ON market_history(item_id, time);
        CREATE INDEX IF NOT EXISTS idx_market_history_server_time ON market_history(server_id, time);
        CREATE INDEX IF NOT EXISTS idx_market_history_item_server_time ON market_history(item_id, server_id, time);
        CREATE INDEX IF NOT EXISTS idx_market_current_server ON market_current(server_id);
        CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
        CREATE INDEX IF NOT EXISTS idx_items_tier ON items(tier);
        CREATE INDEX IF NOT EXISTS idx_servers_region ON servers(region);
    """)
    print("✓ indexes created")


def run_migration() -> None:
    """Run the full migration process with error handling and rollback."""
    # Check if database exists
    if not Path(DB_PATH).exists():
        logger.error(f"Database not found: {DB_PATH}")
        print(f"Error: Database not found at {DB_PATH}")
        sys.exit(1)

    # Create backup
    backup_path = create_backup()

    conn = None
    try:
        conn = get_connection()
        
        # Run migrations in order
        migrate_items(conn)
        migrate_servers(conn)
        migrate_market_current(conn)
        migrate_market_history(conn)
        create_indexes(conn)
        
        # Re-enable foreign keys and commit
        conn.execute("PRAGMA foreign_keys = ON")
        conn.commit()
        
        logger.info("Migration completed successfully")
        print("\n✅ Migration complete!")
        
    except sqlite3.Error as e:
        logger.error(f"Migration failed: {e}")
        print(f"\n❌ Migration failed: {e}")
        
        if conn:
            try:
                conn.rollback()
                logger.info("Transaction rolled back")
                print("Transaction rolled back.")
            except sqlite3.Error as rollback_error:
                logger.error(f"Rollback failed: {rollback_error}")
                print(f"Warning: Rollback failed: {rollback_error}")
        
        # Restore from backup
        print(f"Restoring from backup: {backup_path}")
        try:
            shutil.copy(backup_path, DB_PATH)
            logger.info(f"Database restored from backup: {backup_path}")
            print("Database restored from backup.")
        except Exception as restore_error:
            logger.error(f"Failed to restore backup: {restore_error}")
            print(f"❌ CRITICAL: Failed to restore backup: {restore_error}")
            print(f"Manual intervention required. Backup is at: {backup_path}")
        
        sys.exit(1)
        
    except Exception as e:
        logger.exception(f"Unexpected error during migration: {e}")
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)
        
    finally:
        if conn:
            try:
                conn.execute("PRAGMA foreign_keys = ON")
                conn.close()
            except sqlite3.Error:
                pass


if __name__ == "__main__":
    run_migration()
