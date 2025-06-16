// Inisialisasi daftar file JSON TTN dan CSV Chirpstack yang tersedia
const availableFiles = [
  "TTN-60.json",
  "TTN-120.json",
  "TTN-240.json",
  "TTN-300.json",
  "TTN-420(cuma 6 jam).json",
  "TTN-600(cuma 3 jam).json"
];

// Daftar file CSV yang tersedia
const availableCsvFiles = [
  "Chirpstack-60.csv",
  "Chirpstack-120.csv",
  "Chirpstack-240.csv",
  "Chirpstack-300.csv",
  "Chirpstack-420.csv",
  "Chirpstack-600.csv"
];

// Inisialisasi elemen <select> untuk daftar file
const jsonList = document.getElementById('jsonList');
const csvList = document.getElementById('csvList');

// Isi <select> dengan file yang tersedia
availableFiles.forEach(f => {
  const opt = document.createElement('option');
  opt.value = f;
  opt.textContent = f;
  jsonList.appendChild(opt);
});
availableCsvFiles.forEach(f => {
  const opt = document.createElement('option');
  opt.value = f;
  opt.textContent = f;
  csvList.appendChild(opt);
});

// Fungsi untuk menampilkan indikator loading pada summary cards
function setSummaryLoading(type) {
  const prefix = type === 'csv' ? 'csv-' : '';
  ['avg-temp', 'avg-hum', 'avg-rssi', 'err-rate', 'start-time', 'end-time', 'total-time'].forEach(id => {
    const el = document.getElementById(prefix + id);
    if (el) el.textContent = '...';
  });
}

// Fungsi untuk menampilkan indikator loading pada tabel data
function setTableLoading(type) {
  const tableId = type === 'csv' ? 'csv-table' : 'data-table';
  const table = document.getElementById(tableId);
  if (table) {
    table.innerHTML = '<tbody><tr><td colspan="16" style="text-align:center">Loading...</td></tr></tbody>';
  }
}

// Event handler tombol "Tampilkan Data" TTN
document.getElementById('loadSelected').onclick = async function() {
  const selected = Array.from(jsonList.selectedOptions).map(opt => opt.value);
  if (!selected.length) {
    alert('Pilih setidaknya satu file JSON');
    return;
  }
  document.getElementById('fileName').textContent = selected.join(', ');
  setSummaryLoading('ttn');
  setTableLoading('ttn');
  try {
    let allData = [];
    for (const name of selected) {
      const response = await fetch(name);
      if (!response.ok) throw new Error(`Gagal memuat ${name}`);
      const text = await response.text();
      let parsed = [];
      try {
        const json = JSON.parse(text);
        if (Array.isArray(json)) {
          parsed = json;
        } else if (json && typeof json === 'object') {
          parsed = [json];
        }
      } catch {
        parsed = text.split('\n')
          .map(line => line.trim())
          .filter(line => line)
          .map(line => {
            try { return JSON.parse(line); } catch { return null; }
          })
          .filter(Boolean);
      }
      allData = allData.concat(parsed);
    }
    rawTTNData = allData; // <-- update global data
    renderData(allData);
    updateCompareStatsTable();
  } catch (error) {
    console.error('Error:', error);
    alert(`Error: ${error.message}`);
  }
};

// Fungsi bantu untuk parsing data JSON (array/NDJSON)
function parseJsonData(text) {
  try {
    // Try parsing as JSON array first
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') return [parsed];
    
    // If not array, try NDJSON
    return text.split('\n')
      .map(line => line.trim())
      .filter(line => line)
      .map(line => {
        try { return JSON.parse(line); } 
        catch { return null; }
      })
      .filter(Boolean);
  } catch (e) {
    console.error('Parsing error:', e);
    return [];
  }
}

// Fungsi untuk merender data TTN ke tabel dan summary cards
function renderData(data) {
  const table = document.getElementById('data-table');
  // Pastikan header tabel tetap ada (jangan dihapus/replace)
  let thead = table.querySelector('thead');
  if (!thead) {
    // Jika <thead> hilang karena manipulasi sebelumnya, buat ulang
    thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th>No</th>
        <th>Waktu</th>
        <th>Device ID</th>
        <th>App ID</th>
        <th>Dev EUI</th>
        <th>Dev Addr</th>
        <th>Humidity</th>
        <th>Temperature</th>
        <th>RSSI</th>
        <th>SNR</th>
        <th>Frequency</th>
        <th>SF</th>
        <th>BW</th>
        <th>Coding Rate</th>
        <th>AirTime</th>
        <th>f_cnt</th>
      </tr>
    `;
    table.insertBefore(thead, table.firstChild);
  }

  const tbody = table.querySelector('tbody');
  tbody.innerHTML = '';

  if (!data.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="16" style="text-align:center">Tidak ada data</td>`;
    tbody.appendChild(tr);
    resetSummaryCards('ttn');
    return;
  }

  let no = 1;
  let sumTemp = 0, sumHum = 0, sumRssi = 0;
  let countTemp = 0, countHum = 0, countRssi = 0, countError = 0;
  let waktuArr = [];

  data.forEach(obj => {
    const r = obj.result || obj;
    const ids = r.end_device_ids || {};
    const msg = r.uplink_message || {};
    
    // Format waktu
    let waktu = r.received_at || '-';
    if (waktu && waktu !== '-') {
      const date = new Date(waktu);
      if (!isNaN(date.getTime())) {
        waktuArr.push(date);
        const wib = new Date(date.getTime() + (7 * 60 * 60 * 1000));
        waktu = wib.toLocaleString('id-ID', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }) + ' WIB';
      }
    }

    // Extract data
    const device_id = ids.device_id || '-';
    const app_id = (ids.application_ids && ids.application_ids.application_id) || '-';
    const dev_eui = ids.dev_eui || '-';
    const dev_addr = ids.dev_addr || '-';
    
    let humidity = '-';
    let temperature = '-';
    let validTemp = false, validHum = false;
    if (msg.decoded_payload) {
      humidity = msg.decoded_payload.humidity ?? '-';
      temperature = msg.decoded_payload.temperature ?? '-';
      if (typeof temperature === 'number' && !isNaN(temperature)) {
        sumTemp += temperature;
        countTemp++;
        validTemp = true;
      }
      if (typeof humidity === 'number' && !isNaN(humidity)) {
        sumHum += humidity;
        countHum++;
        validHum = true;
      }
    } else {
      countError++;
    }

    const rx = msg.rx_metadata && msg.rx_metadata[0] ? msg.rx_metadata[0] : {};
    const rssi = rx.rssi ?? '-';
    let validRssi = false;
    if (typeof rssi === 'number' && !isNaN(rssi)) {
      sumRssi += rssi;
      countRssi++;
      validRssi = true;
    }

    const snr = rx.snr ?? '-';
    const frequency = msg.settings?.frequency ?? '-';
    const sf = msg.settings?.data_rate?.lora?.spreading_factor ?? '-';
    const bw = msg.settings?.data_rate?.lora?.bandwidth ?? '-';
    const coding_rate = msg.settings?.data_rate?.lora?.coding_rate ?? '-';
    const airtime = msg.consumed_airtime ?? '-';
    const f_cnt = msg.f_cnt ?? '-';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${no++}</td>
      <td>${waktu}</td>
      <td>${device_id}</td>
      <td>${app_id}</td>
      <td>${dev_eui}</td>
      <td>${dev_addr}</td>
      <td>${validHum ? humidity : '-'}</td>
      <td>${validTemp ? temperature : '-'}</td>
      <td>${validRssi ? rssi : '-'}</td>
      <td>${snr}</td>
      <td>${frequency}</td>
      <td>${sf}</td>
      <td>${bw}</td>
      <td>${coding_rate}</td>
      <td>${airtime}</td>
      <td>${f_cnt}</td>
    `;
    tbody.appendChild(tr);
  });

  // Hitung error rate (jumlah data tanpa decoded_payload)
  const totalRows = data.length;
  let errorRows = 0;
  data.forEach(obj => {
    const r = obj.result || obj;
    const msg = r.uplink_message || {};
    if (!msg.decoded_payload) errorRows++;
  });

  // Update summary cards
  const tempEl = document.getElementById('avg-temp');
  const humEl = document.getElementById('avg-hum');
  const rssiEl = document.getElementById('avg-rssi');
  const errEl = document.getElementById('err-rate');
  const timeEl = document.getElementById('total-time');
  const startEl = document.getElementById('start-time');
  const endEl = document.getElementById('end-time');

  if (tempEl) tempEl.textContent = countTemp > 0 ? (sumTemp / countTemp).toFixed(1) + ' °C' : '-';
  if (humEl) humEl.textContent = countHum > 0 ? (sumHum / countHum).toFixed(1) + ' %' : '-';
  if (rssiEl) rssiEl.textContent = countRssi > 0 ? (sumRssi / countRssi).toFixed(1) + ' dBm' : '-';
  if (errEl) errEl.textContent = totalRows > 0 ? ((errorRows / totalRows) * 100).toFixed(1) + ' %' : '-';
  if (timeEl) timeEl.textContent = window.LoRaCalculator.calculateTimeDuration(waktuArr);

  if (waktuArr.length > 0) {
    waktuArr.sort((a, b) => a - b);
    const first = waktuArr[0];
    const last = waktuArr[waktuArr.length - 1];
    const opts = {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    };
    const firstStr = first.toLocaleString('id-ID', opts) + ' WIB';
    const lastStr = last.toLocaleString('id-ID', opts) + ' WIB';
    if (startEl) startEl.textContent = firstStr;
    if (endEl) endEl.textContent = lastStr;
  } else {
    if (startEl) startEl.textContent = '-';
    if (endEl) endEl.textContent = '-';
  }
}

// Event handler tombol "Tampilkan Data CSV" Chirpstack
document.getElementById('loadCsv').onclick = async function() {
  const selected = Array.from(csvList.selectedOptions).map(opt => opt.value);
  if (!selected.length) {
    alert('Pilih setidaknya satu file CSV');
    return;
  }
  
  document.getElementById('csvFileName').textContent = selected.join(', ');
  setSummaryLoading('csv');
  setTableLoading('csv');
  
  try {
    let allData = [];
    for (const name of selected) {
      const response = await fetch(name);
      if (!response.ok) throw new Error(`Gagal memuat ${name}`);
      const text = await response.text();
      const rows = window.LoRaCalculator.parseCSV(text);
      if (rows.length > 1) {
        const headers = rows[0];
        const dataRows = rows.slice(1).map(row => {
          const obj = {};
          headers.forEach((h, i) => obj[h] = row[i]);
          return obj;
        });
        allData = allData.concat(dataRows);
      }
    }
    rawCSVData = allData; // <-- update global data
    renderCsvTable(allData);
    updateCompareStatsTable();
  } catch (error) {
    console.error('Error:', error);
    alert(`Error: ${error.message}`);
  }
};

// Fungsi untuk merender data CSV ke tabel dan summary cards
function renderCsvTable(data) {
  const table = document.getElementById('csv-table');
  table.innerHTML = '';

  const headers = [
    "id", "timestamp", "device", "temperature", "humidity",
    "rssi", "snr", "frequency", "spreading_factor", "bandwidth", "dev_eui", "payload"
  ];

  // Header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headers.forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Data
  const tbody = document.createElement('tbody');
  if (!data || data.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="${headers.length}" style="text-align:center">Tidak ada data</td>`;
    tbody.appendChild(tr);
    table.appendChild(tbody);
    resetSummaryCards('csv');
    const startEl = document.getElementById('csv-start-time');
    const endEl = document.getElementById('csv-end-time');
    if (startEl) startEl.textContent = '-';
    if (endEl) endEl.textContent = '-';
    return;
  }

  let sumTemp = 0, sumHum = 0, sumRssi = 0;
  let countTemp = 0, countHum = 0, countRssi = 0, countError = 0;
  let waktuArr = [];

  data.forEach(row => {
    const tr = document.createElement('tr');
    headers.forEach((h, index) => {
      const td = document.createElement('td');
      td.textContent = row[h] ?? '';
      tr.appendChild(td);
      if (h === "temperature") {
        const temp = parseFloat(row[h]);
        if (!isNaN(temp)) {
          sumTemp += temp;
          countTemp++;
        }
      } else if (h === "humidity") {
        const hum = parseFloat(row[h]);
        if (!isNaN(hum)) {
          sumHum += hum;
          countHum++;
        }
      } else if (h === "rssi") {
        const rssi = parseFloat(row[h]);
        if (!isNaN(rssi)) {
          sumRssi += rssi;
          countRssi++;
        }
      } else if (h === "timestamp") {
        if (row[h] && row[h] !== '-') {
          const date = window.LoRaCalculator.parseDate(row[h]);
          if (date) waktuArr.push(date);
        }
      }
    });
    if (
      row["temperature"] === '' || isNaN(parseFloat(row["temperature"])) ||
      row["humidity"] === '' || isNaN(parseFloat(row["humidity"]))
    ) {
      countError++;
    }
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);

  // Update summary cards
  const tempEl = document.getElementById('csv-avg-temp');
  const humEl = document.getElementById('csv-avg-hum');
  const rssiEl = document.getElementById('csv-avg-rssi');
  const errEl = document.getElementById('csv-err-rate');
  const timeEl = document.getElementById('csv-total-time');
  const startEl = document.getElementById('csv-start-time');
  const endEl = document.getElementById('csv-end-time');

  if (tempEl) tempEl.textContent = countTemp > 0 ? (sumTemp / countTemp).toFixed(1) + ' °C' : '-';
  if (humEl) humEl.textContent = countHum > 0 ? (sumHum / countHum).toFixed(1) + ' %' : '-';
  if (rssiEl) rssiEl.textContent = countRssi > 0 ? (sumRssi / countRssi).toFixed(1) + ' dBm' : '-';
  if (errEl) errEl.textContent = data.length > 0 ? ((countError / data.length) * 100).toFixed(1) + ' %' : '-';
  if (timeEl) timeEl.textContent = window.LoRaCalculator.calculateTimeDuration(waktuArr);

  if (waktuArr.length > 0) {
    waktuArr.sort((a, b) => a - b);
    const first = waktuArr[0];
    const last = waktuArr[waktuArr.length - 1];
    const opts = {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    };
    const firstStr = first.toLocaleString('id-ID', opts) + ' WIB';
    const lastStr = last.toLocaleString('id-ID', opts) + ' WIB';
    if (startEl) startEl.textContent = firstStr;
    if (endEl) endEl.textContent = lastStr;
  } else {
    if (startEl) startEl.textContent = '-';
    if (endEl) endEl.textContent = '-';
  }
}

// Variabel global untuk menyimpan data mentah TTN dan CSV
let rawTTNData = [];
let rawCSVData = [];

// Fungsi untuk memuat semua file TTN sekaligus (untuk perbandingan)
async function loadAllTTNFiles() {
  let allData = [];
  for (const name of availableFiles) {
    try {
      const response = await fetch(name);
      if (!response.ok) continue;
      const text = await response.text();
      let parsed = [];
      try {
        const json = JSON.parse(text);
        if (Array.isArray(json)) parsed = json;
        else if (json && typeof json === 'object') parsed = [json];
      } catch {
        parsed = text.split('\n')
          .map(line => line.trim())
          .filter(line => line)
          .map(line => { try { return JSON.parse(line); } catch { return null; } })
          .filter(Boolean);
      }
      allData = allData.concat(parsed);
    } catch {}
  }
  return allData;
}

// Fungsi untuk memuat semua file CSV sekaligus (untuk perbandingan)
async function loadAllCSVFiles() {
  let allRows = [];
  for (const name of availableCsvFiles) {
    try {
      const response = await fetch(name);
      if (!response.ok) continue;
      const text = await response.text();
      const rows = window.LoRaCalculator.parseCSV(text);
      if (rows.length > 1) {
        const headers = rows[0];
        const dataRows = rows.slice(1).map(row => {
          const obj = {};
          headers.forEach((h, i) => obj[h] = row[i]);
          return obj;
        });
        allRows = allRows.concat(dataRows);
      }
    } catch {}
  }
  return allRows;
}

// Inisialisasi <select> pada menu perbandingan (compare-container)
const compareTtnSelect = document.getElementById('compare-ttn-select');
const compareCsvSelect = document.getElementById('compare-csv-select');
if (compareTtnSelect && compareCsvSelect) {
  availableFiles.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f;
    opt.textContent = f;
    compareTtnSelect.appendChild(opt);
  });
  availableCsvFiles.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f;
    opt.textContent = f;
    compareCsvSelect.appendChild(opt);
  });
}

// Fungsi untuk memuat data TTN/CSV sesuai file terpilih (atau semua jika kosong)
async function loadTTNForCompare(filename) {
  if (!filename) return await loadAllTTNFiles();
  try {
    const response = await fetch(filename);
    if (!response.ok) return [];
    const text = await response.text();
    let parsed = [];
    try {
      const json = JSON.parse(text);
      if (Array.isArray(json)) parsed = json;
      else if (json && typeof json === 'object') parsed = [json];
    } catch {
      parsed = text.split('\n')
        .map(line => line.trim())
        .filter(line => line)
        .map(line => { try { return JSON.parse(line); } catch { return null; } })
        .filter(Boolean);
    }
    return parsed;
  } catch { return []; }
}
async function loadCSVForCompare(filename) {
  if (!filename) return await loadAllCSVFiles();
  try {
    const response = await fetch(filename);
    if (!response.ok) return [];
    const text = await response.text();
    const rows = window.LoRaCalculator.parseCSV(text);
    if (rows.length > 1) {
      const headers = rows[0];
      return rows.slice(1).map(row => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);
        return obj;
      });
    }
    return [];
  } catch { return []; }
}

// Fungsi utama update tabel statistik perbandingan (summary atas)
function updateCompareStatsTable(ttnData = rawTTNData, csvData = rawCSVData) {
  const tbody = document.getElementById('compare-stats-tbody');
  const sfTbody = document.getElementById('compare-sf-tbody');
  if (!tbody || !sfTbody) return;

  const ttnStats = window.LoRaCalculator.calcStatsTTN(ttnData);
  const csvStats = window.LoRaCalculator.calcStatsCSV(csvData);

  // Kolom: Metric | TTN | ChirpStack
  // Tambahkan nilai sebenarnya pada baris PDR (%)
  tbody.innerHTML = `
    <tr>
      <td>PDR (%)</td>
      <td>${ttnStats.pdr} % <span style="color:#888;font-size:0.95em;">(${ttnStats.total - Math.round(ttnStats.total * (1 - ttnStats.pdr / 100))}/${ttnStats.total})</span></td>
      <td>${csvStats.pdr} % <span style="color:#888;font-size:0.95em;">(${csvStats.total - Math.round(csvStats.total * (1 - csvStats.pdr / 100))}/${csvStats.total})</span></td>
    </tr>
    <tr>
      <td>RSSI Rata-rata ± std dev (dBm)</td>
      <td>${ttnStats.rssi} ± ${ttnStats.rssiStd} dBm</td>
      <td>${csvStats.rssi} ± ${csvStats.rssiStd} dBm</td>
    </tr>
    <tr>
      <td>SNR Rata-rata ± std dev (dB)</td>
      <td>${ttnStats.snr} ± ${ttnStats.snrStd} dB</td>
      <td>${csvStats.snr} ± ${csvStats.snrStd} dB</td>
    </tr>
  `;

  // Kolom: Platform | SF7 | SF8 | SF10 (TTN dulu)
  sfTbody.innerHTML = `
    <tr>
      <td>TTN</td>
      <td>${window.LoRaCalculator.sfPercent(ttnStats.sf['7'], ttnStats.total)}</td>
      <td>${window.LoRaCalculator.sfPercent(ttnStats.sf['8'], ttnStats.total)}</td>
      <td>${window.LoRaCalculator.sfPercent(ttnStats.sf['10'], ttnStats.total)}</td>
    </tr>
    <tr>
      <td>ChirpStack</td>
      <td>${window.LoRaCalculator.sfPercent(csvStats.sf['7'], csvStats.total)}</td>
      <td>${window.LoRaCalculator.sfPercent(csvStats.sf['8'], csvStats.total)}</td>
      <td>${window.LoRaCalculator.sfPercent(csvStats.sf['10'], csvStats.total)}</td>
    </tr>
  `;

  // Update summary cards (atas)
  document.getElementById('compare-pdr').textContent = `${ttnStats.pdr} % / ${csvStats.pdr} %`;
  document.getElementById('compare-rssi').textContent = `${ttnStats.rssi} ± ${ttnStats.rssiStd} dBm / ${csvStats.rssi} ± ${csvStats.rssiStd} dBm`;
  document.getElementById('compare-snr').textContent = `${ttnStats.snr} ± ${ttnStats.snrStd} dB / ${csvStats.snr} ± ${csvStats.snrStd} dB`;
  document.getElementById('compare-sf').textContent =
    `TTN: SF7 ${window.LoRaCalculator.sfPercent(ttnStats.sf['7'], ttnStats.total)}, SF8 ${window.LoRaCalculator.sfPercent(ttnStats.sf['8'], ttnStats.total)}, SF10 ${window.LoRaCalculator.sfPercent(ttnStats.sf['10'], ttnStats.total)}\n` +
    `ChirpStack: SF7 ${window.LoRaCalculator.sfPercent(csvStats.sf['7'], csvStats.total)}, SF8 ${window.LoRaCalculator.sfPercent(csvStats.sf['8'], csvStats.total)}, SF10 ${window.LoRaCalculator.sfPercent(csvStats.sf['10'], csvStats.total)}`;

  // Tambahkan pemanggilan updateCompareIntervalTable
  updateCompareIntervalTable();
}

// Fungsi untuk update tabel statistik per interval (dan trigger update grafik)
function updateCompareIntervalTable() {
  const tbody = document.getElementById('compare-interval-tbody');
  // Tambahan: tbody untuk distribusi SF per interval
  const sfIntervalTbody = document.getElementById('compare-sf-interval-tbody');
  if (!tbody || !sfIntervalTbody) return;

  // Daftar interval dan mapping file
  const intervals = [
    { label: '60 Detik', ttn: 'TTN-60.json', csv: 'Chirpstack-60.csv' },
    { label: '120 Detik', ttn: 'TTN-120.json', csv: 'Chirpstack-120.csv' },
    { label: '240 Detik', ttn: 'TTN-240.json', csv: 'Chirpstack-240.csv' },
    { label: '300 Detik', ttn: 'TTN-300.json', csv: 'Chirpstack-300.csv' },
    { label: '420 Detik', ttn: 'TTN-420(cuma 6 jam).json', csv: 'Chirpstack-420.csv' },
    { label: '600 Detik', ttn: 'TTN-600(cuma 3 jam).json', csv: 'Chirpstack-600.csv' }
  ];

  tbody.innerHTML = '';
  sfIntervalTbody.innerHTML = '';
  let promises = intervals.map(async (item) => {
    // TTN
    let ttnData = [];
    try {
      const response = await fetch(item.ttn);
      if (response.ok) {
        const text = await response.text();
        try {
          const json = JSON.parse(text);
          ttnData = Array.isArray(json) ? json : [json];
        } catch {
          ttnData = text.split('\n')
            .map(line => line.trim())
            .filter(line => line)
            .map(line => { try { return JSON.parse(line); } catch { return null; } })
            .filter(Boolean);
        }
      }
    } catch {}
    // CSV
    let csvData = [];
    try {
      const response = await fetch(item.csv);
      if (response.ok) {
        const text = await response.text();
        const rows = window.LoRaCalculator.parseCSV(text);
        if (rows.length > 1) {
          const headers = rows[0];
          csvData = rows.slice(1).map(row => {
            const obj = {};
            headers.forEach((h, i) => obj[h] = row[i]);
            return obj;
          });
        }
      }
    } catch {}

    // Statistik
    const ttnStats = window.LoRaCalculator.calcStatsTTN(ttnData);
    const csvStats = window.LoRaCalculator.calcStatsCSV(csvData);

    // Hitung jumlah data sukses (jumlah data - error)
    const ttnSuccess = ttnStats.total - Math.round(ttnStats.total * (1 - ttnStats.pdr / 100));
    const csvSuccess = csvStats.total - Math.round(csvStats.total * (1 - csvStats.pdr / 100));

    // Format tabel statistik interval
    const intervalRow = `
      <tr>
        <td>${item.label}</td>
        <td>${ttnStats.pdr}</td>
        <td>${csvStats.pdr}</td>
        <td>${ttnStats.rssi} ± ${ttnStats.rssiStd}</td>
        <td>${csvStats.rssi} ± ${csvStats.rssiStd}</td>
        <td>${ttnStats.snr} ± ${ttnStats.snrStd}</td>
        <td>${csvStats.snr} ± ${csvStats.snrStd}</td>
        <td>${ttnSuccess}/${ttnStats.total}</td>
        <td>${csvSuccess}/${csvStats.total}</td>
      </tr>
    `;

    // Format tabel distribusi SF per interval
    const sfRows = [
      `<tr>
        <td>${item.label}</td>
        <td>TTN</td>
        <td>${window.LoRaCalculator.sfPercent(ttnStats.sf['7'], ttnStats.total)}</td>
        <td>${window.LoRaCalculator.sfPercent(ttnStats.sf['8'], ttnStats.total)}</td>
        <td>${window.LoRaCalculator.sfPercent(ttnStats.sf['10'], ttnStats.total)}</td>
      </tr>`,
      `<tr>
        <td>${item.label}</td>
        <td>ChirpStack</td>
        <td>${window.LoRaCalculator.sfPercent(csvStats.sf['7'], csvStats.total)}</td>
        <td>${window.LoRaCalculator.sfPercent(csvStats.sf['8'], csvStats.total)}</td>
        <td>${window.LoRaCalculator.sfPercent(csvStats.sf['10'], csvStats.total)}</td>
      </tr>`
    ];

    return { intervalRow, sfRows };
  });

  // Setelah semua selesai, render ke tbody
  Promise.all(promises).then(rows => {
    tbody.innerHTML = rows.map(r => r.intervalRow).join('');
    sfIntervalTbody.innerHTML = rows.map(r => r.sfRows.join('')).join('');
    // Tambahkan update diagram PDR
    if (window.updatePDRChartFromTable) {
      window.updatePDRChartFromTable(
        rows.map(r => r.intervalRow)
      );
    }
  });
}

// Event handler tombol "Bandingkan" pada menu perbandingan
document.getElementById('compare-btn').onclick = async function() {
  const ttnFile = compareTtnSelect.value;
  const csvFile = compareCsvSelect.value;
  // Tampilkan loading di summary
  document.getElementById('compare-pdr').textContent = '...';
  document.getElementById('compare-rssi').textContent = '...';
  document.getElementById('compare-snr').textContent = '...';
  document.getElementById('compare-sf').textContent = '...';
  // Load data sesuai pilihan
  const [ttnData, csvData] = await Promise.all([
    loadTTNForCompare(ttnFile),
    loadCSVForCompare(csvFile)
  ]);
  updateCompareStatsTable(ttnData, csvData);
};

// Saat halaman pertama kali dibuka, load semua data & tampilkan statistik default
window.addEventListener('DOMContentLoaded', async function() {
  rawTTNData = await loadAllTTNFiles();
  rawCSVData = await loadAllCSVFiles();
  updateCompareStatsTable(); // <-- gunakan data default (semua)
  renderData(rawTTNData);
  renderCsvTable(rawCSVData);
});

// Semua program grafik Chart.js sudah terhubung dan update otomatis.
// Tidak ada perubahan yang diperlukan.