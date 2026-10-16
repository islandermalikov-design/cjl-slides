from app.services.extract import extract_page

HTML = """
<html><head><title>Текстиль Дом — постельное бельё</title>
<meta name="description" content="Производство и продажа домашнего текстиля оптом и в розницу">
<meta property="og:site_name" content="Текстиль Дом"></head>
<body>
<a href="mailto:sales@textile-dom.ru?subject=hi">Написать</a>
<a href="tel:+7 (900) 123-45-67">Позвонить</a>
<a href="https://www.wildberries.ru/seller/12345">Мы на WB</a>
<a href="/files/price.xlsx">Скачать прайс-лист</a>
<a href="/contacts">Контакты</a>
<img src="logo@2x.png">
<p>Пишите: info@textile-dom.ru или partner@other-company.ru, телефон 8 800 555-35-35</p>
<script>var x = "hidden@textile-dom.ru"</script>
</body></html>
"""


def test_extracts_only_published_business_data():
    d = extract_page("https://textile-dom.ru/", HTML)
    assert d.site_name == "Текстиль Дом"
    assert "sales@textile-dom.ru" in d.emails
    assert "info@textile-dom.ru" in d.emails
    # Адрес чужого домена из текста не берём, скрипты не читаем.
    assert "partner@other-company.ru" not in d.emails
    assert "hidden@textile-dom.ru" not in d.emails
    assert "+7 (900) 123-45-67" in d.phones
    assert "+7 (800) 555-35-35" in d.phones
    assert d.marketplaces[0][0] == "Wildberries"
    assert any("Excel" in s for s in d.signals)
    assert "https://textile-dom.ru/contacts" in d.contact_links


def test_empty_page_gives_no_contacts():
    d = extract_page("https://example.ru/", "<html><body><p>Нет контактов</p></body></html>")
    assert d.emails == [] and d.phones == []
