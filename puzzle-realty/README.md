# Puzzle Realty — презентации для конгресса

14 слайдов, 16:9, собраны на шаблоне конгресса (`assets/congress-template.potx`, баннер сверху идёт с мастер-слайда). Редактируемый .pptx: нативные фигуры и текст, заголовки в настоящих title-плейсхолдерах, тема — Gilroy + фирменные цвета.

- `out/puzzle-realty-zero-budget.pptx` — готовый файл; `out/puzzle-realty-zero-budget.pdf` — превью
- `build_deck.py` — генератор (`python3 build_deck.py`, нужны `python-pptx`, `pillow`, `qrcode`)
- `assets/photos`, `assets/logo` — визуалы и логотипы; заменить файл с тем же именем и пересобрать

Шрифт **Gilroy** нужно установить на компьютере, где открывают файл (в репозиторий не кладётся — лицензия).
Подсказки по визуалам из ТЗ лежат в заметках докладчика каждого слайда.

## Презентации

| Файл | Скрипт | Спикер |
|---|---|---|
| `out/puzzle-realty-zero-budget.pptx` (14 сл.) | `build_deck.py` | Шкурко Марина — клиенты в посёлок без бюджета |
| `out/puzzle-realty-developer-broker.pptx` (15 сл.) | `build_deck_developer_broker.py` | Федорова Мария — девелопер + брокер |

Общий код (шаблон, шрифт, цвета, помощники) — в `deck_lib.py`.
