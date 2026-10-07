# Gaymorova_pazuha.pptx — как заменить картинки

Презентация собирается скриптом, поэтому любой рисунок можно заменить за минуту.

**Вариант 1 (в PowerPoint):** правый клик по картинке → «Изменить рисунок». Рамка уже обрезана под нужную пропорцию.

**Вариант 2 (пересборка):**
1. Положите новые исходники в `source/` (`collage.png`, `anatomy.png`, `develop.png`, `teeth.png`) или напрямую готовые файлы в `images/` под теми же именами.
2. `python3 prep_images.py` — нарезка из исходников (необязательно, если заменяли файлы в `images/`).
3. `node schematics.js` — схемы операций для слайда 11 (можно заменить фото инструментария: `images/surgery_1..5.png`, `images/balloon.png`).
4. `node build.js` — собирает `Gaymorova_pazuha.pptx`.

Карта картинок: `cover_head` — слайд 1 и фон слайда 12; `anatomy_sagittal` — 2; `anatomy_walls`, `wall_1..5` — 3;
`anatomy_frontal` — 4; `near_teeth` — 5; `stage_1..6` — 6; `type_acute/subacute/chronic` — 7; `inflamed_teeth` — 8;
`tooth_step_1..6` — 9; `surgery_1..5`, `balloon` — 11.

Зависимости: `npm install` (pptxgenjs, sharp, react-icons), Python: pillow, numpy, opencv-python-headless.
