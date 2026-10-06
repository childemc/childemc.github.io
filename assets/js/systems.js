(function initSystemsModal() {
  const modal = document.getElementById('system-modal');
  if (!modal) return;
  const body = modal.querySelector('.rmodal-body');

  function close() {
    modal.classList.remove('active');
    body.innerHTML = '';
  }

  document.querySelectorAll('.system-card').forEach(card => {
    card.addEventListener('click', () => {
      const tpl = document.getElementById('video-tpl-' + card.dataset.video);
      body.innerHTML = '';
      body.appendChild(tpl.content.cloneNode(true));
      modal.classList.add('active');
    });
  });

  modal.querySelector('.rmodal-close').addEventListener('click', close);
  modal.querySelector('.rmodal-overlay').addEventListener('click', close);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('active')) close();
  });
})();
