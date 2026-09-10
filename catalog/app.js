(function () {
  var q = document.getElementById('q');
  var chips = Array.prototype.slice.call(document.querySelectorAll('.chip'));
  var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));
  var sections = Array.prototype.slice.call(document.querySelectorAll('.cat'));
  var empty = document.getElementById('empty');
  var active = '';

  function apply() {
    var term = (q.value || '').trim().toLowerCase();
    var shown = 0;
    cards.forEach(function (c) {
      var ok = (!active || c.dataset.cat === active) &&
               (!term || c.dataset.q.indexOf(term) !== -1);
      c.hidden = !ok;
      if (ok) shown++;
    });
    sections.forEach(function (s) {
      s.hidden = !s.querySelector('.card:not([hidden])');
    });
    empty.hidden = shown > 0;
  }

  q.addEventListener('input', apply);
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var f = chip.dataset.filter;
      active = active === f ? '' : f;
      chips.forEach(function (c) {
        c.setAttribute('aria-pressed', String(c.dataset.filter === active));
      });
      apply();
      if (active) {
        var s = document.getElementById(active);
        if (s) s.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    });
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === '/' && document.activeElement !== q) { ev.preventDefault(); q.focus(); }
    if (ev.key === 'Escape' && document.activeElement === q) { q.value = ''; apply(); q.blur(); }
  });
})();
