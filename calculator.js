/**
 * File untuk fungsi-fungsi kalkulasi statistik pada aplikasi web
 */

// Fungsi statistik deskriptif untuk data TTN (mean, stddev, SF, dst)
// RUMUS mencari nilai rata-rata (mean) dan deviasi standar (standar deviasi) SNR
function calcStatsTTN(data, intervalDetik = null) {
  let filtered = data;
  if (intervalDetik) {
    filtered = data.filter(obj => true);
  }
  let total = filtered.length;
  let error = 0, sumRssi = 0, sumSNR = 0, countRssi = 0, countSNR = 0;
  let rssiArr = [], snrArr = [];
  let sfCount = { '7': 0, '8': 0, '10': 0 };
  filtered.forEach(obj => {
    const r = obj.result || obj;
    const msg = r.uplink_message || {};
    if (!msg.decoded_payload) error++;
    // RSSI
    const rx = msg.rx_metadata && msg.rx_metadata[0] ? msg.rx_metadata[0] : {};
    if (typeof rx.rssi === 'number') {
      sumRssi += rx.rssi;
      countRssi++;
      rssiArr.push(rx.rssi);
    }
    if (typeof rx.snr === 'number') {
      sumSNR += rx.snr;
      countSNR++;
      snrArr.push(rx.snr);
    }
    // SF
    const sf = msg.settings?.data_rate?.lora?.spreading_factor;
    if (sf && sfCount[String(sf)] !== undefined) sfCount[String(sf)]++;
  });
  // Hitung deviasi standar
  function stddev(arr, mean) {
    if (!arr.length) return '-';
    const m = mean ?? (arr.reduce((a, b) => a + b, 0) / arr.length);
    const v = arr.reduce((acc, x) => acc + Math.pow(x - m, 2), 0) / arr.length;
    return Math.sqrt(v);
  }
  const meanRssi = countRssi > 0 ? (sumRssi / countRssi) : null;
  const meanSnr = countSNR > 0 ? (sumSNR / countSNR) : null;
  return {
    pdr: total > 0 ? ((total - error) / total * 100).toFixed(1) : '-',
    rssi: countRssi > 0 ? meanRssi.toFixed(1) : '-',
    rssiStd: countRssi > 0 ? stddev(rssiArr, meanRssi).toFixed(2) : '-',
    snr: countSNR > 0 ? meanSnr.toFixed(2) : '-',
    snrStd: countSNR > 0 ? stddev(snrArr, meanSnr).toFixed(2) : '-',
    sf: sfCount,
    total
  };
}

// Fungsi statistik deskriptif untuk data CSV (mean, stddev, SF, dst)
// RUMUS mencari nilai rata-rata (mean) dan deviasi standar (standar deviasi) RSSI
function calcStatsCSV(data, intervalDetik = null) {
  let filtered = data;
  if (intervalDetik) {
    filtered = data.filter(obj => true);
  }
  let total = filtered.length;
  let error = 0, sumRssi = 0, sumSNR = 0, countRssi = 0, countSNR = 0;
  let rssiArr = [], snrArr = [];
  let sfCount = { '7': 0, '8': 0, '10': 0 };
  filtered.forEach(obj => {
    if (
      obj.temperature === '' || isNaN(parseFloat(obj.temperature)) ||
      obj.humidity === '' || isNaN(parseFloat(obj.humidity))
    ) error++;
    const rssi = parseFloat(obj.rssi);
    if (!isNaN(rssi)) {
      sumRssi += rssi;
      countRssi++;
      rssiArr.push(rssi);
    }
    const snr = parseFloat(obj.snr);
    if (!isNaN(snr)) {
      sumSNR += snr;
      countSNR++;
      snrArr.push(snr);
    }
    const sf = obj.spreading_factor;
    if (sf && sfCount[String(sf)] !== undefined) sfCount[String(sf)]++;
  });
  function stddev(arr, mean) {
    if (!arr.length) return '-';
    const m = mean ?? (arr.reduce((a, b) => a + b, 0) / arr.length);
    const v = arr.reduce((acc, x) => acc + Math.pow(x - m, 2), 0) / arr.length;
    return Math.sqrt(v);
  }
  const meanRssi = countRssi > 0 ? (sumRssi / countRssi) : null;
  const meanSnr = countSNR > 0 ? (sumSNR / countSNR) : null;
  return {
    pdr: total > 0 ? ((total - error) / total * 100).toFixed(1) : '-',
    rssi: countRssi > 0 ? meanRssi.toFixed(1) : '-',
    rssiStd: countRssi > 0 ? stddev(rssiArr, meanRssi).toFixed(2) : '-',
    snr: countSNR > 0 ? meanSnr.toFixed(2) : '-',
    snrStd: countSNR > 0 ? stddev(snrArr, meanSnr).toFixed(2) : '-',
    sf: sfCount,
    total
  };
}

// Fungsi menghitung durasi waktu dari array tanggal
function calculateTimeDuration(dates) {
  if (dates.length < 2) return '-';
  
  dates.sort((a, b) => a - b);
  const ms = dates[dates.length - 1] - dates[0];
  const detik = Math.floor(ms / 1000) % 60;
  const menit = Math.floor(ms / (1000 * 60)) % 60;
  const jam = Math.floor(ms / (1000 * 60 * 60));
  
  let str = '';
  if (jam > 0) str += jam + ' jam ';
  if (menit > 0) str += menit + ' menit ';
  str += detik + ' detik';
  
  return str;
}

// Fungsi bantu untuk parsing tanggal dari string
function parseDate(dateStr) {
  // Coba parsing sebagai format ISO terlebih dahulu
  let date = new Date(dateStr.replace(' WIB', ''));
  if (!isNaN(date.getTime())) return date;
  
  // Coba parsing sebagai format lokal (dd/mm/yyyy hh:mm:ss)
  const parts = dateStr.split(/[ ,:\/]+/);
  if (parts.length >= 6) {
    const [dd, mm, yyyy, hh, min, ss] = parts;
    date = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}+07:00`);
    if (!isNaN(date.getTime())) return date;
  }
  
  return null;
}

// Fungsi parsing CSV sederhana (hati-hati dengan tanda kutip)
function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if (char === '\n' && !inQuotes) {
      currentRow.push(currentCell.trim());
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }
  
  // Tambahkan baris terakhir jika ada
  if (currentCell.trim() || currentRow.length) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }
  
  return rows;
}

// Fungsi bantu untuk menghitung persentase SF
function sfPercent(count, total) {
  if (!total || count === 0) return '0 (0%)';
  const pct = ((count / total) * 100).toFixed(1);
  return `${count} (${pct}%)`;
}

// Eksport fungsi-fungsi untuk digunakan di file lain
window.LoRaCalculator = {
  calcStatsTTN,
  calcStatsCSV,
  calculateTimeDuration,
  parseDate,
  parseCSV,
  sfPercent
};
