"""Конфигурация collector из переменных окружения."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=("../../.env", ".env"), extra="ignore")

    collector_token: str = ""
    dadata_api_key: str = ""
    yandex_search_api_key: str = ""
    yandex_folder_id: str = ""
    twogis_api_key: str = ""
    # Честный User-Agent: сервис представляется и даёт контакт для владельцев сайтов.
    user_agent: str = "LeadFlowCollector/0.1 (+https://github.com/leadflow-ai; business-contacts-only)"
    request_timeout: float = 10.0
    max_response_bytes: int = 2_000_000
    max_redirects: int = 3
    min_delay_per_host: float = 1.0
    allow_private_networks: bool = False  # только для тестов


@lru_cache
def get_settings() -> Settings:
    return Settings()
