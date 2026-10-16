from app.adapters.base import Adapter
from app.adapters.dadata import DadataAdapter
from app.adapters.twogis import TwoGisAdapter
from app.adapters.website import WebsiteAdapter
from app.adapters.yandex_search import YandexSearchAdapter

ADAPTERS: dict[str, Adapter] = {a.key: a for a in (YandexSearchAdapter(), TwoGisAdapter(), WebsiteAdapter(), DadataAdapter())}
