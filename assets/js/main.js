/* ── Seeded RNG for reproducible data ── */
function mkRNG(seed) {
  let s = seed >>> 0;
  return function() {
    s = Math.imul(1664525, s) + 1013904223 >>> 0;
    return s / 4294967296;
  };
}

/* ══════════════════════════════════
   RMSD CHART  (D3)
══════════════════════════════════ */
(function buildRMSD() {
  if (!document.getElementById('rmsd-svg')) return;
  const rng = mkRNG(42);

  const n = 600;
  const data = [];
  let rmsd = 1.3;

  function stateAt(i) {
    if      (i < 150) return [1.5, 0.22];  
    else if (i < 180) return [3.0, 0.45];  
    else if (i < 310) return [3.4, 0.38];  
    else if (i < 340) return [5.0, 0.60];  
    else if (i < 440) return [5.2, 0.55];  
    else if (i < 470) return [3.2, 0.45];  
    else              return [2.6, 0.35];  
  }

  for (let i = 0; i < n; i++) {
    const [target, sigma] = stateAt(i);
    rmsd = rmsd * 0.88 + target * 0.12 + (rng()-0.5)*sigma*2;
    rmsd = Math.max(0.6, rmsd);
    data.push({ t: i * (200/n), rmsd });
  }

  const margin = { top: 20, right: 30, bottom: 55, left: 60 };
  const svgEl = document.getElementById('rmsd-svg');
  const W0 = svgEl.parentElement.clientWidth - 4;
  const H0 = 340;
  const W = W0 - margin.left - margin.right;
  const H = H0 - margin.top - margin.bottom;

  const svg = d3.select('#rmsd-svg')
    .attr('width', W0).attr('height', H0);

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain([0, 200]).range([0, W]);
  const y = d3.scaleLinear().domain([0, 7.5]).range([H, 0]);

  const regions = [
    { x0:  0, x1:  50, color: '#8AA3B3', label: 'Lorem (L)', opacity: 0.06 },
    { x0: 60, x1: 113, color: '#3A96A0', label: 'Ipsum (I)', opacity: 0.06 },
    { x0:115, x1: 147, color: '#FDC77C', label: 'Dolor (D)', opacity: 0.06 },
    { x0:157, x1: 200, color: '#3A96A0', label: 'Amet', opacity: 0.06 },
  ];

  regions.forEach(r => {
    g.append('rect')
      .attr('x', x(r.x0)).attr('y', 0)
      .attr('width', x(r.x1)-x(r.x0)).attr('height', H)
      .attr('fill', r.color).attr('opacity', r.opacity);
  });

  g.append('g').attr('class', 'grid')
    .call(d3.axisLeft(y).ticks(6).tickSize(-W).tickFormat(''))
    .selectAll('line').attr('stroke', '#D3DFDF').attr('stroke-dasharray','3,3');
  g.selectAll('.grid .domain').remove();

  g.append('g').attr('transform', `translate(0,${H})`).call(d3.axisBottom(x).ticks(10).tickFormat(d => d+'ms'))
    .selectAll('text').style('font-family','var(--mono)').style('font-size','10px').style('fill','var(--text-dim)');

  g.append('g').call(d3.axisLeft(y).ticks(6).tickFormat(d => d.toFixed(1)+' X'))
    .selectAll('text').style('font-family','var(--mono)').style('font-size','10px').style('fill','var(--text-dim)');

  g.selectAll('.domain').attr('stroke','var(--border)');
  g.selectAll('.tick line').attr('stroke','var(--border)');

  g.append('text').attr('x', W/2).attr('y', H+42)
    .attr('text-anchor','middle').attr('font-family','var(--mono)').attr('font-size',11).attr('fill','var(--text-dim)')
    .text('Tempus (ms)');

  g.append('text').attr('transform','rotate(-90)').attr('x',-H/2).attr('y',-46)
    .attr('text-anchor','middle').attr('font-family','var(--mono)').attr('font-size',11).attr('fill','var(--text-dim)')
    .text('Rutrum (X)');

  const line = d3.line().x(d=>x(d.t)).y(d=>y(d.rmsd)).curve(d3.curveBasis);
  g.append('path').datum(data).attr('fill','none')
    .attr('stroke', '#3A96A0').attr('stroke-width', 1.5).attr('d', line);

  const stateLabels = [
    { t: 25,  label: 'L', y: 0.9 },
    { t: 87,  label: 'I', y: 2.3 },
    { t: 131, label: 'D', y: 4.0 },
    { t: 178, label: 'I*', y: 1.8 },
  ];

  stateLabels.forEach(sl => {
    g.append('text').attr('x', x(sl.t)).attr('y', y(sl.y))
      .attr('text-anchor','middle').attr('font-family','var(--mono)')
      .attr('font-size',11).attr('fill','var(--text-dim)').attr('font-weight','500')
      .text(sl.label);
  });

  const tooltip = g.append('g').style('display','none');
  tooltip.append('line').attr('y1',0).attr('y2',H).attr('stroke','var(--border)').attr('stroke-dasharray','4,4');
  const tcirc = tooltip.append('circle').attr('r',4).attr('fill','var(--accent)').attr('stroke','white').attr('stroke-width',1.5);
  const tbox = tooltip.append('rect').attr('x',8).attr('y',-28).attr('width',115).attr('height',40)
    .attr('fill','white').attr('stroke','var(--border)').attr('rx',2);
  const ttxt = tooltip.append('text').attr('x',14).attr('font-family','var(--mono)').attr('font-size',10).attr('fill','var(--text)');
  const tl1 = ttxt.append('tspan').attr('x',14).attr('dy','-10');
  const tl2 = ttxt.append('tspan').attr('x',14).attr('dy','14');

  svg.append('rect').attr('width', W0).attr('height', H0).attr('fill','none').attr('pointer-events','all')
    .on('mousemove', function(event) {
      const [mx] = d3.pointer(event, g.node());
      const t0 = x.invert(mx);
      const nearest = data.reduce((a,b) => Math.abs(b.t-t0)<Math.abs(a.t-t0)?b:a);
      tooltip.style('display',null).attr('transform',`translate(${x(nearest.t)},${y(nearest.rmsd)})`);
      tl1.text(`t = ${nearest.t.toFixed(1)} ms`);
      tl2.text(`Val = ${nearest.rmsd.toFixed(2)} X`);
      const flip = x(nearest.t) > W - 140;
      tbox.attr('x', flip ? -128 : 8);
      ttxt.attr('x', flip ? -122 : 14);
      tl1.attr('x', flip ? -122 : 14);
      tl2.attr('x', flip ? -122 : 14);
    })
    .on('mouseleave', () => tooltip.style('display','none'));
})();

/* ══════════════════════════════════
   FREE ENERGY SURFACE  (Canvas)
══════════════════════════════════ */
(function buildFES() {
  if (!document.getElementById('fes-canvas')) return;
  const N = 120;
  const XMIN = -4.2, XMAX = 4.2, YMIN = -3.2, YMAX = 3.2;
  const G_MAX = 26; 

  function energy(x, y) {
    const container = 0.28*(x*x + y*y);
    const f = -14.5 * Math.exp(-0.5*((x+2.6)*(x+2.6)/0.75 + (y+1.1)*(y+1.1)/0.55));
    const i_ = -10.5 * Math.exp(-0.5*((x+0.3)*(x+0.3)/0.6 + (y-0.5)*(y-0.5)/0.5));
    const u = -8.5 * Math.exp(-0.5*((x-2.8)*(x-2.8)/1.3 + (y-0.9)*(y-0.9)/0.85));
    const r = 0.5*Math.sin(x*1.5)*Math.cos(y*1.2);
    return container + f + i_ + u + r;
  }

  const vals = new Float32Array(N*N);
  let mn = Infinity;
  for (let iy = 0; iy < N; iy++) {
    for (let ix = 0; ix < N; ix++) {
      const x = XMIN + (ix/(N-1))*(XMAX-XMIN);
      const y = YMAX - (iy/(N-1))*(YMAX-YMIN);
      const v = energy(x, y);
      vals[iy*N+ix] = v;
      if (v < mn) mn = v;
    }
  }
  for (let k = 0; k < vals.length; k++) vals[k] -= mn;

  function fesColor(t) {
    const stops = [
      [0.0,  [8,  60, 140]],
      [0.18, [20, 130, 190]],
      [0.35, [30, 180, 140]],
      [0.55, [160,210,  50]],
      [0.72, [240,175,  30]],
      [0.88, [220, 80,  20]],
      [1.0,  [255,255,255]],
    ];
    for (let i = 0; i < stops.length-1; i++) {
      const [t0, c0] = stops[i];
      const [t1, c1] = stops[i+1];
      if (t >= t0 && t <= t1) {
        const f = (t-t0)/(t1-t0);
        return c0.map((v,j) => Math.round(v*(1-f)+c1[j]*f));
      }
    }
    return [255,255,255];
  }

  const canvas = document.getElementById('fes-canvas');
  const SIZE = 480;
  canvas.width = SIZE; canvas.height = SIZE;
  canvas.style.height = SIZE + 'px';
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(N, N);

  for (let iy = 0; iy < N; iy++) {
    for (let ix = 0; ix < N; ix++) {
      const v = Math.min(vals[iy*N+ix], G_MAX);
      const t = v / G_MAX;
      const [r,g,b] = fesColor(t);
      const idx = (iy*N+ix)*4;
      img.data[idx]=r; img.data[idx+1]=g; img.data[idx+2]=b; img.data[idx+3]=255;
    }
  }

  const offscreen = document.createElement('canvas');
  offscreen.width = N; offscreen.height = N;
  offscreen.getContext('2d').putImageData(img, 0, 0);
  ctx.drawImage(offscreen, 0, 0, SIZE, SIZE);

  ctx.font = '11px "Google Sans Code", monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.textAlign = 'center';
  ctx.fillText('Var 1', SIZE/2, SIZE-6);
  ctx.save();
  ctx.translate(12, SIZE/2);
  ctx.rotate(-Math.PI/2);
  ctx.fillText('Var 2', 0, 0);
  ctx.restore();

  function worldToCanvas(wx, wy) {
    return [
      (wx - XMIN) / (XMAX - XMIN) * SIZE,
      (YMAX - wy) / (YMAX - YMIN) * SIZE
    ];
  }

  const basins = [
    { x:-2.6, y:-1.1, label:'L', color:'#8AA3B3' },
    { x:-0.3, y: 0.5, label:'I', color:'#3A96A0' },
    { x: 2.8, y: 0.9, label:'D', color:'#FDC77C' },
  ];

  basins.forEach(b => {
    const [cx, cy] = worldToCanvas(b.x, b.y);
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI*2);
    ctx.fillStyle = b.color;
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.font = 'bold 13px "Google Sans", sans-serif';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText(b.label, cx, cy - 10);
  });

  const tip = document.getElementById('fes-tooltip');
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const ix = Math.min(N-1, Math.floor(px * N));
    const iy = Math.min(N-1, Math.floor(py * N));
    const wx = XMIN + (ix/(N-1))*(XMAX-XMIN);
    const wy = YMAX - (iy/(N-1))*(YMAX-YMIN);
    const v = Math.min(vals[iy*N+ix], G_MAX).toFixed(1);
    tip.style.display = 'block';
    tip.innerHTML = `V1 = ${wx.toFixed(2)}<br>V2 = ${wy.toFixed(2)}<br>Val = ${v} U`;
  });
  canvas.addEventListener('mouseleave', () => { tip.style.display='none'; });

  const cbar = document.getElementById('colorbar-canvas');
  cbar.width = 24; cbar.height = 200;
  const cctx = cbar.getContext('2d');
  for (let y = 0; y < 200; y++) {
    const t = 1 - y/199;
    const [r,g,b] = fesColor(t);
    cctx.fillStyle = `rgb(${r},${g},${b})`;
    cctx.fillRect(0, y, 24, 1);
  }
})();

/* ══════════════════════════════════
   Rg HISTOGRAM  (D3)
══════════════════════════════════ */
(function buildRg() {
  if (!document.getElementById('rg-svg')) return;
  const rng = mkRNG(77);

  const samples = [];
  for (let i = 0; i < 4000; i++) {
    const u = rng();
    let rg;
    if (u < 0.45) {
      rg = 12.5 + 0.55 * boxMuller(rng);
    } else if (u < 0.72) {
      rg = 16.5 + 1.0 * boxMuller(rng);
    } else {
      rg = 21.0 + 1.6 * boxMuller(rng);
    }
    samples.push(rg);
  }

  function boxMuller(r) {
    const u1 = r(), u2 = rng();
    return Math.sqrt(-2*Math.log(Math.max(1e-10,u1))) * Math.cos(2*Math.PI*u2);
  }

  const margin = { top:20, right:30, bottom:55, left:65 };
  const svgEl = document.getElementById('rg-svg');
  const W0 = svgEl.parentElement.clientWidth - 4;
  const H0 = 340;
  const W = W0 - margin.left - margin.right;
  const H = H0 - margin.top - margin.bottom;

  const svg = d3.select('#rg-svg').attr('width',W0).attr('height',H0);
  const g = svg.append('g').attr('transform',`translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain([9, 26]).range([0, W]);
  const bins = d3.bin().domain(x.domain()).thresholds(40)(samples);
  const y = d3.scaleLinear().domain([0, d3.max(bins, b=>b.length)*1.08]).range([H, 0]);

  g.append('g').call(d3.axisLeft(y).ticks(6).tickSize(-W).tickFormat(''))
    .selectAll('line').attr('stroke','#D3DFDF').attr('stroke-dasharray','3,3');
  g.selectAll('.grid .domain').remove();

  function barColor(x0) {
    if (x0 < 14.5) return '#8AA3B3';
    if (x0 < 19)   return '#3A96A0';
    return '#FDC77C';
  }

  g.selectAll('rect.bar').data(bins).join('rect')
    .attr('class','bar')
    .attr('x', d => x(d.x0)+1)
    .attr('width', d => Math.max(0, x(d.x1)-x(d.x0)-1.5))
    .attr('y', d => y(d.length))
    .attr('height', d => H - y(d.length))
    .attr('fill', d => barColor(d.x0))
    .attr('opacity', 0.72);

  g.append('g').attr('transform',`translate(0,${H})`).call(d3.axisBottom(x).ticks(8).tickFormat(d=>d+' X'))
    .selectAll('text').style('font-family','var(--mono)').style('font-size','10px').style('fill','var(--text-dim)');
  g.append('g').call(d3.axisLeft(y).ticks(6).tickFormat(d=>d3.format(',')(d)))
    .selectAll('text').style('font-family','var(--mono)').style('font-size','10px').style('fill','var(--text-dim)');
  g.selectAll('.domain').attr('stroke','var(--border)');
  g.selectAll('.tick line').attr('stroke','var(--border)');

  g.append('text').attr('x',W/2).attr('y',H+42).attr('text-anchor','middle')
    .attr('font-family','var(--mono)').attr('font-size',11).attr('fill','var(--text-dim)')
    .text('Eget Dolor (X)');
  g.append('text').attr('transform','rotate(-90)').attr('x',-H/2).attr('y',-50)
    .attr('text-anchor','middle').attr('font-family','var(--mono)').attr('font-size',11).attr('fill','var(--text-dim)')
    .text('Fringilla');

  [{ x:12.5, label:'Lorem', color:'#8AA3B3'},
   { x:16.5, label:'Ipsum', color:'#3A96A0'},
   { x:21.0, label:'Dolor', color:'#FDC77C'}].forEach(b => {
    g.append('text').attr('x',x(b.x)).attr('y',20)
     .attr('text-anchor','middle').attr('font-family','var(--mono)').attr('font-size',10)
     .attr('fill',b.color).text(b.label);
  });
})();

/* ══════════════════════════════════
   TAB SWITCHING
══════════════════════════════════ */
function switchTab(id, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-'+id).classList.add('active');
  btn.classList.add('active');
}

/* ══════════════════════════════════════════════════════
   NGL VIEWER — file upload, trajectory player, presets
══════════════════════════════════════════════════════ */

let nglStage = null;
let nglComponent = null;     
let nglTrajectory = null;    
let trajFrameCount = 0;
let trajCurrentFrame = 0;
let trajPlaying = false;
let trajPlayInterval = null;
let trajSpeed = 1;           
let darkBg = true;
let spinning = false;

let reprRows = [];
let reprIdCounter = 0;

const COLOR_OPTIONS = [
  ['residueindex', 'N→C Spectrum'],
  ['sstruc',       'Secondary Structure'],
  ['chainid',      'Chain'],
  ['element',      'Element (CPK)'],
  ['hydrophobicity','Hydrophobicity'],
  ['bfactor',      'B-factor / RMSF'],
  ['electrostatic','Electrostatic'],
  ['uniform',      'Uniform (white)'],
];

const REPR_OPTIONS = [
  'cartoon', 'backbone', 'tube', 'ribbon',
  'surface', 'licorice', 'ball+stick', 'spacefill',
  'line', 'contact', 'rope', 'helixorient',
];

window.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('ngl-viewport')) return;
  nglStage = new NGL.Stage('ngl-viewport', {
    backgroundColor: '#0d1520',
    quality: 'high',
    sampleLevel: 1,
  });

  window.addEventListener('resize', () => nglStage.handleResize());

  addReprRow();

  wireDrop('dz-struct', 'file-struct', handleStructFile);
  wireDrop('dz-traj',   'file-traj',   handleTrajFile);
});

function wireDrop(zoneId, inputId, handler) {
  const zone = document.getElementById(zoneId);
  const input = document.getElementById(inputId);

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f) handler(f);
  });
  input.addEventListener('change', () => { if (input.files[0]) handler(input.files[0]); });
}

function handleStructFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();

  const ph = document.getElementById('ngl-placeholder');
  if (ph) ph.innerHTML = '<span style="color:#8AA3B3;font-family:var(--mono);font-size:0.72rem;letter-spacing:0.08em">Loading…</span>';

  if (nglComponent) { nglStage.removeComponent(nglComponent); nglComponent = null; }
  nglTrajectory = null;
  hideTrajPlayer();

  nglStage.loadFile(file, { ext }).then(comp => {
    nglComponent = comp;
    if (ph) ph.style.display = 'none';

    const dz = document.getElementById('dz-struct');
    dz.classList.add('loaded');
    document.getElementById('struct-name').textContent = '✓ ' + file.name;

    applyRepresentations();
    nglStage.autoView();
  }).catch(err => {
    if (ph) ph.innerHTML = `<span style="color:#c0392b;font-family:var(--mono);font-size:0.7rem">Error: ${err.message || 'could not load file'}</span>`;
  });
}

function handleTrajFile(file) {
  if (!nglComponent) {
    alert('Load a structure file first, then add the trajectory.');
    return;
  }

  const ext = file.name.split('.').pop().toLowerCase();

  nglComponent.addTrajectory(file, { ext }).then(traj => {
    nglTrajectory = traj;
    trajFrameCount = traj.trajectory.frameCount || 0;
    trajCurrentFrame = 0;

    const slider = document.getElementById('frame-slider');
    slider.max = Math.max(0, trajFrameCount - 1);
    slider.value = 0;
    document.getElementById('frame-tot').textContent = trajFrameCount - 1;
    document.getElementById('frame-cur').textContent = 0;

    showTrajPlayer();

    const dz = document.getElementById('dz-traj');
    dz.classList.add('loaded');
    document.getElementById('traj-name').textContent = '✓ ' + file.name;
  }).catch(err => {
    alert('Trajectory error: ' + (err.message || err));
  });
}

function applyRepresentations() {
  if (!nglComponent) return;
  nglComponent.removeAllRepresentations();

  reprRows.forEach(row => {
    const typeEl  = document.getElementById('repr-type-' + row.id);
    const colorEl = document.getElementById('repr-color-' + row.id);
    const type  = typeEl  ? typeEl.value  : 'cartoon';
    const color = colorEl ? colorEl.value : 'residueindex';

    try {
      nglComponent.addRepresentation(type, { color, opacity: 1.0 });
    } catch(e) { }
  });

  nglStage.autoView();
}

function addReprRow(type='cartoon', color='residueindex') {
  const id = ++reprIdCounter;
  reprRows.push({ id });

  const list = document.getElementById('repr-list');
  const row = document.createElement('div');
  row.className = 'repr-row';
  row.id = 'repr-row-' + id;

  const typeSelect = document.createElement('select');
  typeSelect.className = 'repr-select';
  typeSelect.id = 'repr-type-' + id;
  REPR_OPTIONS.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o; opt.textContent = o;
    if (o === type) opt.selected = true;
    typeSelect.appendChild(opt);
  });
  typeSelect.onchange = applyRepresentations;

  const colorWrap = document.createElement('div');
  colorWrap.className = 'repr-color';
  colorWrap.title = 'Color scheme';
  colorWrap.textContent = '🎨';
  const colorSelect = document.createElement('select');
  colorSelect.id = 'repr-color-' + id;
  COLOR_OPTIONS.forEach(([val, label]) => {
    const opt = document.createElement('option');
    opt.value = val; opt.textContent = label;
    if (val === color) opt.selected = true;
    colorSelect.appendChild(opt);
  });
  colorSelect.onchange = applyRepresentations;
  colorWrap.appendChild(colorSelect);

  const del = document.createElement('button');
  del.className = 'repr-del';
  del.textContent = '×';
  del.title = 'Remove';
  del.onclick = () => {
    reprRows = reprRows.filter(r => r.id !== id);
    row.remove();
    applyRepresentations();
  };

  row.appendChild(typeSelect);
  row.appendChild(colorWrap);
  row.appendChild(del);
  list.appendChild(row);
}

const QUICK_PRESETS = {
  overview: [
    { type: 'cartoon', color: 'sstruc' },
    { type: 'surface', color: 'hydrophobicity' },
  ],
  publication: [
    { type: 'ribbon', color: 'residueindex' },
    { type: 'licorice', color: 'element' },
  ],
  hydrophobic: [
    { type: 'surface', color: 'hydrophobicity' },
  ],
  bfactor: [
    { type: 'cartoon', color: 'bfactor' },
    { type: 'backbone', color: 'bfactor' },
  ],
  atomistic: [
    { type: 'ball+stick', color: 'element' },
  ],
};

function applyQuickPreset(name) {
  const preset = QUICK_PRESETS[name];
  if (!preset) return;

  reprRows = [];
  reprIdCounter = 0;
  document.getElementById('repr-list').innerHTML = '';

  preset.forEach(p => addReprRow(p.type, p.color));
  applyRepresentations();
}

function exportPreset() {
  const rows = reprRows.map(r => ({
    type:  document.getElementById('repr-type-'  + r.id)?.value || 'cartoon',
    color: document.getElementById('repr-color-' + r.id)?.value || 'residueindex',
  }));
  const json = JSON.stringify({ representations: rows, version: 1 }, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'viz-preset.json'; a.click();
  URL.revokeObjectURL(url);
}

function importPreset(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.representations) throw new Error('Invalid preset file');

      reprRows = [];
      reprIdCounter = 0;
      document.getElementById('repr-list').innerHTML = '';

      data.representations.forEach(r => addReprRow(r.type, r.color));
      applyRepresentations();
    } catch(err) {
      alert('Could not load preset: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function showTrajPlayer() { document.getElementById('traj-player').classList.add('visible'); }
function hideTrajPlayer() { document.getElementById('traj-player').classList.remove('visible'); }

function trajPlay() {
  if (!nglTrajectory) return;
  trajPlaying = !trajPlaying;
  const btn = document.getElementById('traj-play-btn');

  if (trajPlaying) {
    btn.textContent = '⏸ Pause';
    btn.classList.add('active');
    trajPlayInterval = setInterval(() => {
      trajCurrentFrame = (trajCurrentFrame + trajSpeed) % trajFrameCount;
      nglTrajectory.trajectory.setFrame(trajCurrentFrame);
      document.getElementById('frame-slider').value = trajCurrentFrame;
      document.getElementById('frame-cur').textContent = trajCurrentFrame;
    }, 50);
  } else {
    btn.textContent = '▶ Aliquet';
    btn.classList.remove('active');
    clearInterval(trajPlayInterval);
  }
}

function trajStep(delta) {
  if (!nglTrajectory) return;
  trajCurrentFrame = Math.max(0, Math.min(trajFrameCount - 1, trajCurrentFrame + delta));
  nglTrajectory.trajectory.setFrame(trajCurrentFrame);
  document.getElementById('frame-slider').value = trajCurrentFrame;
  document.getElementById('frame-cur').textContent = trajCurrentFrame;
}

function trajSeek(val) {
  trajCurrentFrame = parseInt(val);
  if (nglTrajectory) nglTrajectory.trajectory.setFrame(trajCurrentFrame);
  document.getElementById('frame-cur').textContent = trajCurrentFrame;
}

const SPEEDS = [1, 2, 5, 10];
let speedIdx = 0;
function cycleSpeed() {
  speedIdx = (speedIdx + 1) % SPEEDS.length;
  trajSpeed = SPEEDS[speedIdx];
  document.getElementById('traj-speed-btn').textContent = trajSpeed + '×';
}

function toggleSpin() {
  spinning = !spinning;
  const btn = document.getElementById('spin-btn');
  btn.textContent = '↻ Porttitor: ' + (spinning ? 'On' : 'Off');
  btn.classList.toggle('active', spinning);
  if (nglStage) nglStage.setSpin(spinning);
}

function toggleBg() {
  darkBg = !darkBg;
  if (nglStage) nglStage.setParameters({ backgroundColor: darkBg ? '#0d1520' : '#ffffff' });
}

const obs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vis'); obs.unobserve(e.target); }});
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

// ── PUBLICATIONS (live feed) ──────────────────────────────────────────────────
const ORCID_ID  = '0000-0003-2440-9612';
const ORCID_BASE = `https://pub.orcid.org/v3.0/${ORCID_ID}`;
const ORCID_HDR  = { Accept: 'application/vnd.orcid+json' };

/** Extract the value of a specific external-id type from an ORCID external-ids block. */
function orcidExtId(externalIds, type) {
  const found = (externalIds?.['external-id'] ?? [])
    .find(x => x['external-id-type'] === type && x['external-id-relationship'] === 'self');
  return found?.['external-id-value'] ?? null;
}

/** Chunk an array into sub-arrays of at most `size` elements. */
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

let allPubs = [];

function renderPubs(pubs) {
  const container = document.querySelector('.pub-list');
  container.innerHTML = '';

  if (!pubs.length) {
    container.innerHTML = '<div class="pub-loading">No publications found.</div>';
    return;
  }

  pubs.forEach(pub => {
    const titleHtml = pub.doi
      ? `<a href="https://doi.org/${pub.doi}" target="_blank" rel="noopener">${pub.title}</a>`
      : pub.title;

    const hasCitations = pub.citations != null;
    const badgeClass   = hasCitations ? 'pub-cite-badge' : 'pub-cite-badge no-data';
    const badgeNum     = hasCitations ? pub.citations : '–';

    const el = document.createElement('div');
    el.className = 'pub-item reveal';
    el.innerHTML = `
      <div>
        <div class="pub-year">${pub.year}</div>
        <div class="pub-title">${titleHtml}</div>
        ${pub.authors ? `<div class="pub-authors">${pub.authors}</div>` : ''}
      </div>
      <div class="pub-journal">
        <div class="${badgeClass}">${badgeNum}<span class="cite-label">citations</span></div>
        <strong>${pub.journal ?? ''}</strong>
      </div>
    `;
    container.appendChild(el);
    obs.observe(el);
  });
}

function sortedPubs(key, dir) {
  return [...allPubs].sort((a, b) => {
    const av = key === 'citations' ? (a.citations ?? -1) : (a.year ?? 0);
    const bv = key === 'citations' ? (b.citations ?? -1) : (b.year ?? 0);
    return dir === 'desc' ? bv - av : av - bv;
  });
}

async function loadPublications() {
  const container = document.querySelector('.pub-list');
  if (!container) return;
  container.innerHTML = '<div class="pub-loading">Loading publications…</div>';

  try {
    // ── Step A: works summary (titles, years, journals, put-codes, DOIs, PMIDs) ──
    const summaryRes = await fetch(`${ORCID_BASE}/works`, { headers: ORCID_HDR });
    if (!summaryRes.ok) throw new Error(`ORCID summary ${summaryRes.status}`);
    const summaryJson = await summaryRes.json();

    // One canonical summary per group (first = preferred source)
    const summaries = (summaryJson.group ?? []).map(g => g['work-summary'][0]);

    // ── Step B: bulk full works in batches of 100 (needed for contributor lists) ──
    const putCodes = summaries.map(s => s['put-code']);
    const bulkChunks = await Promise.all(
      chunk(putCodes, 100).map(codes =>
        fetch(`${ORCID_BASE}/works/${codes.join(',')}`, { headers: ORCID_HDR })
          .then(r => r.json())
          .then(r => (r.bulk ?? []).filter(b => b.work).map(b => b.work))
      )
    );
    const fullWorks = bulkChunks.flat();

    // Build a quick lookup: put-code → full work
    const workByCode = new Map(fullWorks.map(w => [w['put-code'], w]));

    // ── Step C: resolve DOI → PMID via Europe PMC (iCite has no DOI lookup) ──
    const doiToPmid = new Map();
    const doisToResolve = summaries
      .filter(s => !orcidExtId(s['external-ids'], 'pmid'))
      .map(s => orcidExtId(s['external-ids'], 'doi'))
      .filter(Boolean);

    await Promise.all(chunk(doisToResolve, 25).map(async dois => {
      try {
        const q = dois.map(d => `DOI:"${d}"`).join(' OR ');
        const res = await fetch(
          'https://www.ebi.ac.uk/europepmc/webservices/rest/search?format=json&resultType=lite&pageSize=100&query='
          + encodeURIComponent(q)
        );
        if (!res.ok) return;
        const json = await res.json();
        (json.resultList?.result ?? []).forEach(r => {
          if (r.doi && r.pmid) doiToPmid.set(r.doi.toLowerCase(), String(r.pmid));
        });
      } catch (e) {
        console.warn('Europe PMC lookup failed:', e);
      }
    }));

    const pmidFor = s => {
      const pmid = orcidExtId(s['external-ids'], 'pmid');
      if (pmid) return String(pmid);
      const doi = orcidExtId(s['external-ids'], 'doi');
      return doi ? doiToPmid.get(doi.toLowerCase()) ?? null : null;
    };

    // ── Step D: iCite citation counts by PMID ────────────────────────────────
    const pmids = [...new Set(summaries.map(pmidFor).filter(Boolean))];
    const pmidCitationMap = new Map();
    await Promise.all(chunk(pmids, 200).map(async ids => {
      try {
        const res = await fetch(`https://icite.od.nih.gov/api/pubs?pmids=${ids.join(',')}`);
        if (!res.ok) return;
        const json = await res.json();
        (json.data ?? []).forEach(p => pmidCitationMap.set(String(p.pmid), p.citation_count));
      } catch (e) {
        console.warn('iCite lookup failed:', e);
      }
    }));

    // ── Build unified records ──────────────────────────────────────────────────
    allPubs = summaries
      .map(s => {
        const full    = workByCode.get(s['put-code']);
        const doi     = orcidExtId(s['external-ids'], 'doi');
        const pmid    = pmidFor(s);
        const year    = parseInt(s['publication-date']?.year?.value, 10) || null;
        const title   = s.title?.title?.value ?? '(Untitled)';
        const journal = s['journal-title']?.value ?? null;

        const contributors = full?.contributors?.contributor ?? [];
        const authors = contributors
          .map(c => c['credit-name']?.value)
          .filter(Boolean)
          .join(', ');

        const citations = pmid ? pmidCitationMap.get(pmid) ?? null : null;

        return { year, title, journal, authors, doi, pmid, citations };
      })
      .filter(p => p.year);

    // ── Initial render: year descending ───────────────────────────────────────
    renderPubs(sortedPubs('year', 'desc'));

    // ── Wire sort buttons ─────────────────────────────────────────────────────
    document.querySelectorAll('.pub-sort-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key        = btn.dataset.sort;
        const activeBtn  = document.querySelector('.pub-sort-btn.active');
        let dir;

        if (activeBtn === btn) {
          // Same button: toggle direction
          dir = btn.dataset.dir === 'desc' ? 'asc' : 'desc';
        } else {
          // Different button: switch key, default to descending
          dir = 'desc';
          activeBtn?.classList.remove('active');
          btn.classList.add('active');
        }

        btn.dataset.dir = dir;
        btn.querySelector('.sort-arrow').textContent = dir === 'desc' ? '↓' : '↑';
        renderPubs(sortedPubs(key, dir));
      });
    });

  } catch (err) {
    console.error('Failed to load publications:', err);
    container.innerHTML = `<div class="pub-loading">Could not load publications. Check the console for details.</div>`;
  }
}

loadPublications();

/* ══════════════════════════════════
   RESEARCH CARD MODALS
══════════════════════════════════ */
(function initResearchModals() {
  const modal = document.getElementById('research-modal');
  if (!modal) return;
  document.body.appendChild(modal); // escape ancestor stacking contexts so it overlays the navbar

  const modalOverlay = modal.querySelector('.rmodal-overlay');
  const modalClose = modal.querySelector('.rmodal-close');

  // Open modal when card is clicked
  document.querySelectorAll('.r-card[data-card-id]').forEach(card => {
    card.addEventListener('click', () => {
      const img = card.querySelector('.r-card-img');
      const modalImg = modal.querySelector('.rmodal-img');
      modalImg.src = img.currentSrc || img.src;
      modalImg.alt = card.querySelector('h3')?.textContent ?? '';
      modal.querySelector('.rmodal-caption').textContent =
        card.querySelector('.r-card-caption')?.textContent.trim() ?? '';
      modal.classList.add('active');
    });
  });

  // Close modal
  function closeModal() {
    modal.classList.remove('active');
  }

  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', closeModal);

  // Close on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });
})();
