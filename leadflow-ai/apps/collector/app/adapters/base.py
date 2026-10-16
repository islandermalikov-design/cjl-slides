"""Базовый класс адаптера источника данных.

Новый разрешённый источник добавляется отдельным модулем: реализуйте Adapter и
зарегистрируйте экземпляр в app/adapters/registry.py.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from app.schemas.models import AdapterInfo, Candidate


class Adapter(ABC):
    key: str
    name: str
    description: str
    source_type: str
    legal_notes: str
    query_fields: list[str]

    def availability(self) -> tuple[bool, str | None]:
        return True, None

    def info(self) -> AdapterInfo:
        ok, reason = self.availability()
        return AdapterInfo(
            key=self.key,
            name=self.name,
            description=self.description,
            sourceType=self.source_type,
            available=ok,
            reason=reason,
            legalNotes=self.legal_notes,
            queryFields=self.query_fields,
        )

    @abstractmethod
    async def discover(self, query: dict, limit: int) -> tuple[list[Candidate], list[str]]:
        """Возвращает кандидатов и предупреждения."""
