from app.adapters.base import Adapter
from app.adapters.dadata import DadataAdapter
from app.adapters.website import WebsiteAdapter

ADAPTERS: dict[str, Adapter] = {a.key: a for a in (WebsiteAdapter(), DadataAdapter())}
