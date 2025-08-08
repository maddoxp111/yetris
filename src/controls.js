
(() => {
  const map = {
    ArrowLeft: ()=>Yetris.moveLeft(),
    ArrowRight: ()=>Yetris.moveRight(),
    ArrowUp: ()=>Yetris.rotate(),
    ArrowDown: ()=>Yetris.softDrop(true),
    Space: ()=>Yetris.hardDrop(),
  };
  window.addEventListener('keydown', (e)=>{
    if (e.code === 'Space') e.preventDefault();
    if (map[e.key]) map[e.key]();
  });
  window.addEventListener('keyup', (e)=>{
    if (e.key === 'ArrowDown') Yetris.softDrop(false);
  });

  // Mobile touch controls
  const panel = document.getElementById('mobileControls');
  panel.addEventListener('touchstart', (e)=>{
    const btn = e.target.closest('button');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act==='left') Yetris.moveLeft();
    if (act==='right') Yetris.moveRight();
    if (act==='rotate') Yetris.rotate();
    if (act==='drop') Yetris.softDrop(true);
    if (act==='hard') Yetris.hardDrop();
  }, {passive:true});
  panel.addEventListener('touchend', (e)=>{
    const btn = e.target.closest('button');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act==='drop') Yetris.softDrop(false);
  }, {passive:true});
})();
