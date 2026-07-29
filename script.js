/* =========================================================================
   TRAFIX — script.js
   Sections:
   1. Utilities
   2. Sidebar toggle
   3. Real-time date & time
   4. Animated counters
   5. Sparkline mini-charts
   6. Junction signal simulation
   7. Analytics charts (Chart.js)
   8. History table (data, render, search, filter, pagination)
   9. Ripple effect
   ========================================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initSidebarToggle();
  initNavActiveState();
  initClock();
  initCounters();
  initSparklines();
  initJunctionSignals();
  initCharts();
  initHistoryTable();
  initRipple();
  initFooterTimestamp();
});

/* ---------- 1. Utilities ---------- */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

function pad(n) { return n.toString().padStart(2, '0'); }

/* ---------- 2. Sidebar toggle ---------- */
function initSidebarToggle() {
  const shell = $('.app-shell');
  const toggleBtn = $('#sidebarToggle');
  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    if (window.innerWidth <= 960) {
      shell.classList.toggle('sidebar-open');
    } else {
      shell.classList.toggle('collapsed');
    }
  });
}

/* Active nav-link highlight on click */
function initNavActiveState() {
  const links = $$('.nav-link');
  links.forEach(link => {
    link.addEventListener('click', () => {
      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      if (window.innerWidth <= 960) {
        $('.app-shell').classList.remove('sidebar-open');
      }
    });
  });
}

/* ---------- 3. Real-time date & time ---------- */
function initClock() {
  const dateEl = $('#currentDate');
  const timeEl = $('#currentTime');

  function tick() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    if (dateEl) dateEl.textContent = dateStr;
    if (timeEl) timeEl.textContent = timeStr;
  }
  tick();
  setInterval(tick, 1000);
}

/* ---------- 4. Animated counters ---------- */
function initCounters() {
  const counters = $$('[data-counter]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  counters.forEach(c => observer.observe(c));
}

function animateCounter(el) {
  const target = parseFloat(el.dataset.target || '0');
  const suffix = el.dataset.suffix || '';
  const duration = 1400;
  const start = performance.now();

  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const value = Math.round(target * eased);
    el.textContent = value.toLocaleString('en-IN') + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ---------- 5. Sparkline mini-charts ---------- */
function initSparklines() {
  if (typeof Chart === 'undefined') return;

  const sparkConfigs = [
    { id: 'sparkVehicles', data: [12, 19, 14, 22, 18, 26, 24, 30], color: '#3B82F6' },
    { id: 'sparkWait', data: [50, 46, 48, 40, 44, 38, 42, 36], color: '#F59E0B' },
    { id: 'sparkTraffic', data: [30, 40, 55, 48, 62, 58, 66, 62], color: '#EF4444' },
    { id: 'sparkAqi', data: [70, 74, 68, 80, 76, 82, 85, 87], color: '#22C55E' },
  ];

  sparkConfigs.forEach(cfg => {
    const canvas = document.getElementById(cfg.id);
    if (!canvas) return;
    new Chart(canvas, {
      type: 'line',
      data: {
        labels: cfg.data.map((_, i) => i),
        datasets: [{
          data: cfg.data,
          borderColor: cfg.color,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4,
          fill: true,
          backgroundColor: hexToRgba(cfg.color, 0.12),
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1200, easing: 'easeOutQuart' },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: { display: false }
        },
        elements: { line: { borderJoinStyle: 'round' } }
      }
    });
  });
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ---------- 6. Junction signal simulation ---------- */
function initJunctionSignals() {
  const lights = {
    north: $$('.light[data-light="north"]'),
    south: $$('.light[data-light="south"]'),
    east: $$('.light[data-light="east"]'),
    west: $$('.light[data-light="west"]'),
  };
  const activeLabel = $('#activeSignalLabel');
  const countdownEl = $('#signalCountdown');

  // Sequence: [phase name, duration seconds, which axis is green]
  const sequence = [
    { label: 'North\u2013South \u00b7 Green', axis: 'ns', state: 'green', duration: 8 },
    { label: 'North\u2013South \u00b7 Amber', axis: 'ns', state: 'amber', duration: 2 },
    { label: 'East\u2013West \u00b7 Green', axis: 'ew', state: 'green', duration: 8 },
    { label: 'East\u2013West \u00b7 Amber', axis: 'ew', state: 'amber', duration: 2 },
  ];

  let phaseIndex = 0;
  let secondsLeft = sequence[0].duration;

  function applyPhase(phase) {
    // reset all
    Object.values(lights).forEach(group => group.forEach(l => l.classList.remove('on')));

    const nsLights = [...lights.north, ...lights.south];
    const ewLights = [...lights.east, ...lights.west];

    const activeGroup = phase.axis === 'ns' ? nsLights : ewLights;
    const idleGroup = phase.axis === 'ns' ? ewLights : nsLights;

    activeGroup.forEach(l => {
      if (l.classList.contains(phase.state)) l.classList.add('on');
    });
    idleGroup.forEach(l => {
      if (l.classList.contains('red')) l.classList.add('on');
    });

    if (activeLabel) activeLabel.textContent = phase.label;
  }

  applyPhase(sequence[phaseIndex]);
  if (countdownEl) countdownEl.textContent = `${secondsLeft}s`;

  setInterval(() => {
    secondsLeft--;
    if (secondsLeft <= 0) {
      phaseIndex = (phaseIndex + 1) % sequence.length;
      secondsLeft = sequence[phaseIndex].duration;
      applyPhase(sequence[phaseIndex]);
    }
    if (countdownEl) countdownEl.textContent = `${secondsLeft}s`;
  }, 1000);
}

/* ---------- 7. Analytics charts ---------- */
function initCharts() {
  if (typeof Chart === 'undefined') return;

  Chart.defaults.color = '#94A3B8';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 11;

  const gridColor = 'rgba(51, 65, 85, 0.4)';
  const green = '#22C55E';
  const blue = '#3B82F6';
  const amber = '#F59E0B';

  /* Vehicles per hour */
  const vphCanvas = document.getElementById('vehiclesPerHourChart');
  if (vphCanvas) {
    new Chart(vphCanvas, {
      type: 'bar',
      data: {
        labels: ['06:00','08:00','10:00','12:00','14:00','16:00','18:00','20:00','22:00'],
        datasets: [{
          label: 'Vehicles',
          data: [420, 980, 760, 640, 590, 710, 1120, 860, 430],
          backgroundColor: hexToRgba(green, 0.7),
          borderRadius: 6,
          maxBarThickness: 34,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 1400, easing: 'easeOutQuart' },
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: gridColor }, beginAtZero: true }
        }
      }
    });
  }

  /* Peak traffic share (doughnut) */
  const peakCanvas = document.getElementById('peakTrafficChart');
  if (peakCanvas) {
    new Chart(peakCanvas, {
      type: 'doughnut',
      data: {
        labels: ['Morning Peak', 'Evening Peak', 'Off-Peak'],
        datasets: [{
          data: [35, 44, 21],
          backgroundColor: [blue, green, '#334155'],
          borderColor: '#111827',
          borderWidth: 3,
          hoverOffset: 6,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 1400, easing: 'easeOutQuart' },
        cutout: '68%',
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 8, padding: 14 } } }
      }
    });
  }

  /* Average waiting time (line) */
  const waitCanvas = document.getElementById('waitTimeChart');
  if (waitCanvas) {
    new Chart(waitCanvas, {
      type: 'line',
      data: {
        labels: ['06:00','09:00','12:00','15:00','18:00','21:00'],
        datasets: [{
          label: 'Wait (s)',
          data: [22, 48, 35, 40, 58, 30],
          borderColor: amber,
          backgroundColor: hexToRgba(amber, 0.15),
          fill: true,
          tension: 0.45,
          pointRadius: 4,
          pointBackgroundColor: amber,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 1400, easing: 'easeOutQuart' },
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: gridColor }, beginAtZero: true }
        }
      }
    });
  }

  /* Weekly traffic trend (line, two series) */
  const weeklyCanvas = document.getElementById('weeklyTrendChart');
  if (weeklyCanvas) {
    new Chart(weeklyCanvas, {
      type: 'line',
      data: {
        labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
        datasets: [
          {
            label: 'This week',
            data: [4200, 4600, 4400, 4800, 5300, 3900, 3100],
            borderColor: green,
            backgroundColor: hexToRgba(green, 0.12),
            fill: true, tension: 0.4, pointRadius: 3,
          },
          {
            label: 'Last week',
            data: [3900, 4300, 4100, 4500, 4900, 3700, 2900],
            borderColor: '#475569',
            borderDash: [5, 5],
            backgroundColor: 'transparent',
            fill: false, tension: 0.4, pointRadius: 0,
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 1400, easing: 'easeOutQuart' },
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: gridColor } }
        }
      }
    });
  }

  /* AQI trend */
  const aqiCanvas = document.getElementById('aqiTrendChart');
  if (aqiCanvas) {
    new Chart(aqiCanvas, {
      type: 'line',
      data: {
        labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
        datasets: [{
          label: 'AQI',
          data: [78, 82, 90, 85, 96, 88, 87],
          borderColor: amber,
          backgroundColor: hexToRgba(amber, 0.12),
          fill: true, tension: 0.45, pointRadius: 3,
          pointBackgroundColor: amber,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 1400, easing: 'easeOutQuart' },
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: gridColor }, beginAtZero: true }
        }
      }
    });
  }
}

/* ---------- 8. History table ---------- */
const HISTORY_DATA = generateHistoryData();

function generateHistoryData() {
  const junctions = ['MG Road \u00d7 Ashok Marg', 'Hazratganj Crossing', 'Kanpur Road Junction', 'Alambagh Chowk', 'Gomti Nagar Extension', 'Charbagh Circle'];
  const signals = ['Green', 'Amber', 'Red'];
  const rows = [];
  const now = new Date();

  for (let i = 0; i < 42; i++) {
    const t = new Date(now.getTime() - i * 18 * 60000);
    const signal = signals[Math.floor(Math.random() * signals.length)];
    const aqi = 40 + Math.floor(Math.random() * 140);
    rows.push({
      time: `${pad(t.getHours())}:${pad(t.getMinutes())}`,
      junction: junctions[i % junctions.length],
      vehicles: 180 + Math.floor(Math.random() * 620),
      wait: 15 + Math.floor(Math.random() * 70),
      signal,
      aqi,
    });
  }
  return rows;
}

function aqiClass(aqi) {
  if (aqi <= 80) return 'aqi-good';
  if (aqi <= 150) return 'aqi-moderate';
  return 'aqi-poor';
}
function aqiBand(aqi) {
  if (aqi <= 80) return 'good';
  if (aqi <= 150) return 'moderate';
  return 'poor';
}
function signalPillClass(signal) {
  if (signal === 'Green') return 'pill-green';
  if (signal === 'Amber') return 'pill-amber';
  return 'pill-red';
}

const PAGE_SIZE = 8;
let currentPage = 1;

function initHistoryTable() {
  const searchInput = $('#historySearch');
  const signalFilter = $('#filterSignal');
  const aqiFilter = $('#filterAqi');

  renderHistoryTable();

  searchInput && searchInput.addEventListener('input', () => { currentPage = 1; renderHistoryTable(); });
  signalFilter && signalFilter.addEventListener('change', () => { currentPage = 1; renderHistoryTable(); });
  aqiFilter && aqiFilter.addEventListener('change', () => { currentPage = 1; renderHistoryTable(); });
}

function getFilteredHistory() {
  const query = ($('#historySearch')?.value || '').toLowerCase().trim();
  const signalVal = $('#filterSignal')?.value || '';
  const aqiVal = $('#filterAqi')?.value || '';

  return HISTORY_DATA.filter(row => {
    const matchesQuery = !query ||
      row.junction.toLowerCase().includes(query) ||
      row.signal.toLowerCase().includes(query) ||
      row.time.includes(query);
    const matchesSignal = !signalVal || row.signal === signalVal;
    const matchesAqi = !aqiVal || aqiBand(row.aqi) === aqiVal;
    return matchesQuery && matchesSignal && matchesAqi;
  });
}

function renderHistoryTable() {
  const tbody = $('#historyTableBody');
  const tableInfo = $('#tableInfo');
  const pagination = $('#pagination');
  if (!tbody) return;

  const filtered = getFilteredHistory();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, totalPages);

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  tbody.innerHTML = pageRows.map(row => `
    <tr>
      <td class="mono">${row.time}</td>
      <td>${row.junction}</td>
      <td class="mono">${row.vehicles.toLocaleString('en-IN')}</td>
      <td class="mono">${row.wait}s</td>
      <td><span class="signal-pill ${signalPillClass(row.signal)}">${row.signal}</span></td>
      <td class="aqi-pill ${aqiClass(row.aqi)}">${row.aqi}</td>
    </tr>
  `).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-secondary);padding:24px;">No matching records found.</td></tr>`;

  if (tableInfo) {
    const shownFrom = filtered.length === 0 ? 0 : start + 1;
    const shownTo = Math.min(start + PAGE_SIZE, filtered.length);
    tableInfo.textContent = `Showing ${shownFrom}\u2013${shownTo} of ${filtered.length} records`;
  }

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const pagination = $('#pagination');
  if (!pagination) return;

  let buttons = '';
  buttons += `<button class="page-btn" data-page="prev" ${currentPage === 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>`;

  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  startPage = Math.max(1, endPage - maxButtons + 1);

  for (let p = startPage; p <= endPage; p++) {
    buttons += `<button class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
  }
  buttons += `<button class="page-btn" data-page="next" ${currentPage === totalPages ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button>`;

  pagination.innerHTML = buttons;

  $$('.page-btn', pagination).forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.page;
      if (val === 'prev') currentPage = Math.max(1, currentPage - 1);
      else if (val === 'next') currentPage = Math.min(totalPages, currentPage + 1);
      else currentPage = parseInt(val, 10);
      renderHistoryTable();
    });
  });
}

/* ---------- 9. Ripple effect ---------- */
function initRipple() {
  const targets = $$('.chip-btn, .ghost-btn, .page-btn, .icon-btn, .admin-profile');
  targets.forEach(el => el.classList.add('ripple-btn'));

  document.addEventListener('click', (e) => {
    const target = e.target.closest('.ripple-btn');
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    target.appendChild(ripple);
    setTimeout(() => ripple.remove(), 650);
  });
}

/* ---------- Footer timestamp ---------- */
function initFooterTimestamp() {
  const el = $('#footerUpdated');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' \u00b7 ' + `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}