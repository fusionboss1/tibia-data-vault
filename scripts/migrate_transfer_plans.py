import sqlite3

from backend import DB_PATH


def migrate_transfer_plans():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS transfer_plans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'purchasing', 'transferred', 'selling', 'completed')),
                source_server_id INTEGER NOT NULL,
                destination_server_id INTEGER,
                source_tc_price REAL NOT NULL DEFAULT 0 CHECK (source_tc_price >= 0),
                destination_tc_price REAL NOT NULL DEFAULT 0 CHECK (destination_tc_price >= 0),
                transfer_cost REAL NOT NULL DEFAULT 750 CHECK (transfer_cost >= 0),
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (source_server_id) REFERENCES servers(id),
                FOREIGN KEY (destination_server_id) REFERENCES servers(id)
            );

            CREATE TABLE IF NOT EXISTS transfer_plan_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                plan_id INTEGER NOT NULL,
                item_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
                purchase_price REAL NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
                expected_sale_price REAL NOT NULL DEFAULT 0 CHECK (expected_sale_price >= 0),
                actual_sale_price REAL NOT NULL DEFAULT 0 CHECK (actual_sale_price >= 0),
                sold_quantity INTEGER NOT NULL DEFAULT 0 CHECK (sold_quantity >= 0 AND sold_quantity <= quantity),
                sale_status TEXT NOT NULL DEFAULT 'planned' CHECK (sale_status IN ('planned', 'listed', 'partial', 'sold')),
                source_market_price REAL NOT NULL DEFAULT 0 CHECK (source_market_price >= 0),
                destination_buy_offer REAL NOT NULL DEFAULT 0 CHECK (destination_buy_offer >= 0),
                destination_sell_offer REAL NOT NULL DEFAULT 0 CHECK (destination_sell_offer >= 0),
                notes TEXT,
                FOREIGN KEY (plan_id) REFERENCES transfer_plans(id) ON DELETE CASCADE,
                FOREIGN KEY (item_id) REFERENCES items(id),
                UNIQUE (plan_id, item_id)
            );

            CREATE INDEX IF NOT EXISTS idx_transfer_plans_updated ON transfer_plans(updated_at DESC);
            CREATE INDEX IF NOT EXISTS idx_transfer_plan_items_plan ON transfer_plan_items(plan_id);
        """)
        conn.commit()
        print("Transfer plan tables are ready")
    finally:
        conn.close()


if __name__ == '__main__':
    migrate_transfer_plans()
