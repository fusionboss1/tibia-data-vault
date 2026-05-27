"""Pydantic models for data validation and serialization."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class Server(BaseModel):
    """Server model representing a Tibia game world."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    name: str
    region: str
    pvp_type: str = Field(alias="pvp_type")
    battleye: Optional[str] = None
    notes: Optional[str] = None
    release_date: Optional[str] = None
    market_last_fetch: Optional[datetime] = None
    api_last_update: Optional[str] = None


class ServerCreate(BaseModel):
    """Model for creating a new server."""
    name: str
    region: str
    pvp_type: str = Field(alias="pvp_type")
    battleye: Optional[str] = None
    notes: Optional[str] = None
    release_date: Optional[str] = None


class ServerUpdate(BaseModel):
    """Model for updating an existing server."""
    name: Optional[str] = None
    region: Optional[str] = None
    pvp_type: Optional[str] = Field(default=None, alias="pvp_type")
    battleye: Optional[str] = None
    notes: Optional[str] = None
    release_date: Optional[str] = None
    market_last_fetch: Optional[datetime] = None
    api_last_update: Optional[str] = None


class Item(BaseModel):
    """Item model representing a Tibia game item."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    name: str
    category: str
    tier: Optional[int] = Field(ge=0, default=None)
    wiki_name: Optional[str] = None
    best_npc_sell_price: Optional[int] = Field(ge=0, default=None)
    best_npc_sell_npcs: Optional[str] = None
    best_npc_buy_price: Optional[int] = Field(ge=0, default=None)
    best_npc_buy_npcs: Optional[str] = None


class WeeklyDeliveryItem(BaseModel):
    """Weekly delivery pool entry for an item."""
    model_config = ConfigDict(from_attributes=True)

    item_id: int
    is_active: bool = True
    source_order: Optional[int] = None
    source_market_value: Optional[str] = None
    notes: Optional[str] = None
    added_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class MarketCurrent(BaseModel):
    """Current market data for an item on a specific server."""
    model_config = ConfigDict(from_attributes=True)
    
    item_id: int = Field(alias="item_id")
    server_id: int = Field(alias="server_id")
    time: datetime
    buy_offer: int = Field(ge=0)
    sell_offer: int = Field(ge=0)
    buy_offers: int = Field(ge=0)
    sell_offers: int = Field(ge=0)


class MarketHistory(BaseModel):
    """Historical market data record for an item on a specific server."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    item_id: int = Field(alias="item_id")
    server_id: int = Field(alias="server_id")
    time: datetime
    buy_offer: int = Field(ge=0)
    sell_offer: int = Field(ge=0)
    buy_offers: int = Field(ge=0)
    sell_offers: int = Field(ge=0)


class StashInventoryItem(BaseModel):
    """A single item in the stash inventory."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    item_id: int
    item_name: str
    quantity: int
    updated_at: Optional[datetime] = None
    category: Optional[str] = None
    tier: Optional[int] = None
    best_npc_buy_price: Optional[int] = None
    best_npc_buy_npcs: Optional[str] = None
    best_npc_sell_price: Optional[int] = None
    best_npc_sell_npcs: Optional[str] = None


class StashImportRequest(BaseModel):
    """Request body for importing a log paste."""
    log_text: str


class StashImportResult(BaseModel):
    """Result summary after a log import."""
    items_imported: int
    unmatched_names: list[str] = []
    ambiguous_names: list[str] = []


class ApiResponse(BaseModel):
    """Standard API response wrapper."""
    success: bool = True
    data: Optional[dict] = None
    message: Optional[str] = None
    count: Optional[int] = None


class ErrorResponse(BaseModel):
    """Standard error response."""
    success: bool = False
    error: str
    details: Optional[str] = None
