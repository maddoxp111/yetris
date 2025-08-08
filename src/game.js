
// YETRIS — physics Tetris with Kanye skins
// Hybrid approach: pieces start as rigid tetrominoes (constraints).
// Once they settle, constraints break so edge cubes can tumble.
// Lines clear when a band is fully occupied by cube centers.

(() => {
  const { Engine, Render, Runner, World, Bodies, Body, Composite, Composites, Constraint, Events } = Matter;

  // DOM
  const canvas = document.getElementById('game');
  const scoreEl = document.getElementById('score');
  const linesEl = document.getElementById('lines');
  const levelEl = document.getElementById('level');
  const btnStart = document.getElementById('btnStart');
  const btnPause = document.getElementById('btnPause');
  const btnReset = document.getElementById('btnReset');

  const CELL = 28;             // size of a square block
  const COLS = 10;
  const ROWS = 22;
  const WELL_W = COLS * CELL;
  const WELL_H = ROWS * CELL;
  const BORDER = 24;           // walls thickness
  const GRAVITY_BASE = 0.0018; // starts gentle for playability

  // Canvas sizing for device pixel ratio
  function fitCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const maxHeight = canvas.parentElement.clientHeight || 600;
    const maxWidth = canvas.parentElement.clientWidth || 600;
    const scale = Math.min(maxWidth / WELL_W, maxHeight / WELL_H);
    canvas.width = WELL_W * dpr * scale;
    canvas.height = WELL_H * dpr * scale;
    canvas.style.width = `${WELL_W * scale}px`;
    canvas.style.height = `${WELL_H * scale}px`;
    return { scale, dpr };
  }
  let view = fitCanvas();
  window.addEventListener('resize', () => { view = fitCanvas(); });

  // Physics engine
  const engine = Engine.create();
  engine.gravity.y = GRAVITY_BASE;
  const render = Render.create({
    canvas,
    engine,
    options: {
      width: canvas.width,
      height: canvas.height,
      pixelRatio: 1,
      wireframes: false,
      background: '#0a0a0a'
    }
  });
  Render.run(render);
  const runner = Runner.create();
  Runner.run(runner, engine);

  // World: walls
  const walls = [
    Bodies.rectangle(WELL_W/2, WELL_H + BORDER/2, WELL_W + BORDER*2, BORDER, { isStatic:true, render:{ fillStyle:'#222'}}),
    Bodies.rectangle(-BORDER/2, WELL_H/2, BORDER, WELL_H + BORDER*2, { isStatic:true, render:{ fillStyle:'#222'}}),
    Bodies.rectangle(WELL_W + BORDER/2, WELL_H/2, BORDER, WELL_H + BORDER*2, { isStatic:true, render:{ fillStyle:'#222'}}),
    Bodies.rectangle(WELL_W/2, -BORDER/2, WELL_W + BORDER*2, BORDER, { isStatic:true, render:{ fillStyle:'#222'}}),
  ];
  World.add(engine.world, walls);

  // Skins (album covers)
// Skins (album covers) — now support remote manifest
  const REMOTE_MANIFEST_URL = (typeof window.YETRIS_REMOTE_MANIFEST_URL === 'string') ? window.YETRIS_REMOTE_MANIFEST_URL : null;
  let remoteManifest = null;
  async function loadManifest() {
    if (!REMOTE_MANIFEST_URL) return null;
    try {
      const res = await fetch(REMOTE_MANIFEST_URL, { mode: 'cors' });
      if (!res.ok) throw new Error('manifest fetch failed');
      const data = await res.json();
      return data;
    } catch (e) {
      console.warn('Manifest load error', e);
      return null;
    }
  }

  const skinNames = ["college_dropout", "late_registration", "graduation", "808s", "mbdtf", "yeezus", "tlop"];
  const skinCache = new Map();
  function loadTexture(url) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    return new Promise(resolve => {
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null); // fallback
    });
  }
  async function ensureSkins() {
    remoteManifest = await loadManifest();
    const map = new Map();
    // Map tetromino name => album key
    const tetroToAlbum = {
      'I':'college_dropout',
      'J':'late_registration',
      'L':'graduation',
      'O':'808s',
      'S':'mbdtf',
      'T':'yeezus',
      'Z':'tlop',
    };
    for (const [tetro, albumKey] of Object.entries(tetroToAlbum)) {
      let url = `assets/images/${albumKey}.jpg`;
      if (remoteManifest?.skins?.[tetro]) {
        url = remoteManifest.skins[tetro];
      }
      const img = await loadTexture(url);
      skinCache.set(albumKey, img); // may be null
    }
  }
  ensureSkins();

  // Random helpers
  const rand = (arr)=> arr[Math.floor(Math.random()*arr.length)];

  // Tetromino definitions as array of relative coords (x,y) in cells
  // Using classic 7 shapes; we map each to one album skin
  const TETROS = [
    { name:'I', cells:[[0,0],[1,0],[2,0],[3,0]], skin:'college_dropout' },
    { name:'J', cells:[[0,0],[0,1],[1,1],[2,1]], skin:'late_registration' },
    { name:'L', cells:[[2,0],[0,1],[1,1],[2,1]], skin:'graduation' },
    { name:'O', cells:[[0,0],[1,0],[0,1],[1,1]], skin:'808s' },
    { name:'S', cells:[[1,0],[2,0],[0,1],[1,1]], skin:'mbdtf' },
    { name:'T', cells:[[1,0],[0,1],[1,1],[2,1]], skin:'yeezus' },
    { name:'Z', cells:[[0,0],[1,0],[1,1],[2,1]], skin:'tlop' },
  ];

  function makeBlock(x, y, skinName) {
    const img = skinCache.get(skinName);
    const block = Bodies.rectangle(x, y, CELL, CELL, {
      friction: 0.15,
      frictionStatic: 0.8,
      restitution: 0.05,
      chamfer: { radius: 3 },
      render: img ? { sprite: { texture: img.src, xScale: CELL/img.width, yScale: CELL/img.height } }
                  : { fillStyle: '#'+(Math.random()*0xffffff|0).toString(16).padStart(6,'0') }
    });
    return block;
  }

  function rotateCells(cells) {
    // rotate 90 deg CW around origin
    return cells.map(([x,y]) => [y, -x]);
  }

  let currentPiece = null;
  let currentConstraints = [];
  let isRunning = false;
  let softDrop = false;
  let level = 1;
  let score = 0;
  let lines = 0;
  let dropTimer = 0;
  let pieceStartTime = 0;

  function spawnPiece() {
    const def = rand(TETROS);
    let cells = def.cells.map(([x,y])=>[x,y]);
    const originX = Math.round(COLS/2 - 2) * CELL + CELL/2;
    const originY = CELL*1.5;

    const blocks = cells.map(([cx,cy]) => makeBlock(originX + cx*CELL, originY + cy*CELL, def.skin));
    // Link into rigid via constraints
    const constraints = [];
    const center = blocks[0];
    for (let i=1;i<blocks.length;i++) {
      constraints.push(Constraint.create({
        bodyA: center,
        bodyB: blocks[i],
        stiffness: 1,
        render: { visible:false },
      }));
    }
    World.add(engine.world, blocks);
    World.add(engine.world, constraints);
    currentPiece = { def, cells, blocks, center };
    currentConstraints = constraints;
    pieceStartTime = performance.now();
    SFX.onSpawn();
  }

  function breakConstraints() {
    for (const c of currentConstraints) Composite.remove(engine.world, c);
    currentConstraints = [];
  }

  function pieceSettled() {
    // heuristics: low velocity of center block & time since spawn
    if (!currentPiece) return false;
    const v = currentPiece.center.velocity;
    const speed = Math.hypot(v.x, v.y);
    return speed < 0.02 && (performance.now() - pieceStartTime) > 600;
  }

  function tryRotate() {
    if (!currentPiece || currentConstraints.length===0) return;
    // Rotate blocks around the center block
    const pivot = currentPiece.center.position;
    for (const b of currentPiece.blocks) {
      const dx = b.position.x - pivot.x;
      const dy = b.position.y - pivot.y;
      const nx = pivot.x + (-dy);
      const ny = pivot.y + (dx);
      Body.setPosition(b, {x:nx, y:ny});
    }
    SFX.onRotate();
  }

  function move(dx) {
    if (!currentPiece) return;
    const amt = dx * CELL * 0.98;
    for (const b of currentPiece.blocks) Body.translate(b, {x:amt, y:0});
    SFX.onMove();
  }

  function drop(hard=false) {
    if (!currentPiece) return;
    if (hard) {
      for (const b of currentPiece.blocks) Body.setVelocity(b, {x:b.velocity.x, y:18});
      SFX.onHardDrop();
    } else {
      for (const b of currentPiece.blocks) Body.applyForce(b, b.position, {x:0, y:0.002});
      SFX.onSoftDrop();
    }
  }

  function updateGravity() {
    engine.gravity.y = GRAVITY_BASE + (level-1)*0.0004 + (softDrop?0.003:0);
  }

  // Line detection: consider centers of all block bodies and bin into rows by y
  function scanAndClearLines() {
    const bodies = Composite.allBodies(engine.world).filter(b => !b.isStatic && b.label === 'Body');
    const grid = new Map();
    const EPS = CELL*0.45;
    for (const b of bodies) {
      // Skip blocks currently part of a constrained falling piece (we still include though; behavior feels better if included)
      const x = b.position.x;
      const y = b.position.y;
      if (x < 0 || x > WELL_W || y < 0 || y > WELL_H) continue;
      const col = Math.round((x - CELL/2) / CELL);
      const row = Math.round((y - CELL/2) / CELL);
      const key = `${row}`;
      if (!grid.has(key)) grid.set(key, new Map());
      const rowMap = grid.get(key);
      rowMap.set(col, b);
    }
    let cleared = 0;
    for (let r=0; r<ROWS; r++) {
      const rowMap = grid.get(`${r}`);
      if (!rowMap) continue;
      let full = true;
      for (let c=0;c<COLS;c++) {
        if (!rowMap.has(c)) { full = false; break; }
      }
      if (full) {
        cleared++;
        // Remove bodies in row r
        for (const b of rowMap.values()) Composite.remove(engine.world, b);
        // Award score
        addScore( (r>=ROWS-2? 60:100) );
        SFX.onLine();
      }
    }
    if (cleared>0) {
      lines += cleared;
      linesEl.textContent = lines;
      // small level up curve
      if (lines % 8 === 0) {
        level++;
        levelEl.textContent = level;
        SFX.onLevel();
      }
      updateGravity();
    }
  }

  function addScore(n) {
    score += n;
    scoreEl.textContent = score;
  }

  function tick() {
    if (!isRunning) return;

    // spawn if needed
    if (!currentPiece) spawnPiece();

    // auto-break constraints once settled so edge cubes tumble
    if (currentPiece && currentConstraints.length>0 && pieceSettled()) {
      breakConstraints();
      SFX.onLock();
      // next piece soon
      setTimeout(()=>{
        currentPiece = null;
      }, 250);
    }

    // periodic line scan
    const now = performance.now();
    if (now - dropTimer > 250) {
      scanAndClearLines();
      dropTimer = now;
    }

    requestAnimationFrame(tick);
  }

  // PUBLIC API for controls
  window.Yetris = {
    start(){
      if (isRunning) return;
      isRunning = true;
      Runner.start(runner, engine);
      SFX.onStart();
      tick();
    },
    pause(){
      isRunning = false;
      Runner.stop(runner);
      SFX.onPause();
    },
    reset(){
      // wipe world except walls
      const toRemove = Composite.allBodies(engine.world).filter(b=>!b.isStatic);
      for (const b of toRemove) Composite.remove(engine.world, b);
      currentPiece = null;
      currentConstraints = [];
      score = 0; lines = 0; level = 1;
      scoreEl.textContent = 0; linesEl.textContent = 0; levelEl.textContent = 1;
      updateGravity();
      SFX.onReset();
    },
    moveLeft(){ move(-1); },
    moveRight(){ move(1); },
    rotate(){ tryRotate(); },
    softDrop(on){ softDrop = !!on; updateGravity(); },
    hardDrop(){ drop(true); },
    submitScore(name){
      Leaderboard.post({ name, score }).then(()=>{
        Leaderboard.list().then(renderBoard);
      });
    },
    getScore(){ return score; },
  };

  // Buttons
  btnStart.addEventListener('click', ()=>Yetris.start());
  btnPause.addEventListener('click', ()=>Yetris.pause());
  btnReset.addEventListener('click', ()=>Yetris.reset());

  // Name & leaderboard UI
  const saveNameBtn = document.getElementById('saveName');
  const nameInput = document.getElementById('playerName');
  const boardEl = document.getElementById('leaderboard');
  saveNameBtn.addEventListener('click', ()=>{
    const n = nameInput.value.trim() || 'Anon';
    localStorage.setItem('yetris:name', n);
    Yetris.submitScore(n);
    nameInput.value = n;
  });
  nameInput.value = localStorage.getItem('yetris:name') || '';

  function renderBoard(items) {
    boardEl.innerHTML = '';
    for (const [i, it] of items.entries()) {
      const li = document.createElement('li');
      li.textContent = `${i+1}. ${it.name} — ${it.score}`;
      boardEl.appendChild(li);
    }
  }
  // realtime board updates
  Leaderboard.onChange(renderBoard);
  Leaderboard.list().then(renderBoard);

})();
