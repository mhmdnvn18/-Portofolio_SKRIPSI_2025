<!--
  README ini menjelaskan metodologi, metrik, proses analisis, dan hasil penelitian.
  Setiap bagian diberi heading dan penjelasan agar mudah dipahami.
  Data dan hasil analisis diambil dari aplikasi website yang telah dibuat.
-->

# BAB 3: Metodologi Penelitian

Penelitian ini menggunakan sensor DHT11 yang mengirim data temperatur dan kelembapan secara berkala melalui jaringan LoRaWAN ke dua backend jaringan yang berbeda: server lokal **ChirpStack** dan jaringan publik **The Things Network (TTN)**. Perangkat sensor terhubung ke gateway LoRa yang sama, namun data uplink diteruskan secara paralel ke kedua server. Data dari server ChirpStack tersedia dalam format CSV, sedangkan data dari TTN berbentuk JSON. Masing-masing jalur dianggap sebagai kelompok data terpisah untuk perbandingan.

**Variabel kinerja yang dianalisis:**
- Packet Delivery Ratio (PDR)
- RSSI (Received Signal Strength Indicator)
- SNR (Signal-to-Noise Ratio)
- Data rate (ditentukan oleh Spreading Factor/SF)
- Latency (jika data tersedia)

Data diorganisasi berdasarkan percobaan dengan interval pengiriman sensor yang berbeda (misal: 120 detik dan 240 detik), dengan nama file yang mengandung “TTN” sebagai data dari TTN dan file lainnya dari ChirpStack.

**Proses analisis:**
- Pengolahan data untuk mendapatkan statistik deskriptif (rata-rata, standar deviasi, distribusi) dari setiap variabel.
- Pengujian perbandingan antara kedua server menggunakan uji statistik (misal: uji-t independen) untuk melihat apakah perbedaan rata-rata metrik signifikan.

---

## Penjelasan Metrik

1. **Packet Delivery Ratio (PDR):** Persentase paket yang berhasil diterima dibandingkan dengan jumlah paket yang dikirimkan oleh sensor. Contoh: jika 90 dari 100 paket terkirim sukses, PDR = 90%. **PDR bukan rata-rata, melainkan persentase keberhasilan.**
2. **RSSI:** Menunjukkan kekuatan sinyal terima (dalam dBm, nilai negatif); semakin dekat ke nol, semakin kuat sinyal yang diterima. **Ditampilkan sebagai rata-rata ± standar deviasi.**
3. **SNR:** Rasio daya sinyal terhadap daya noise (dalam dB); nilai SNR positif tinggi menunjukkan kualitas sinyal yang baik. **Ditampilkan sebagai rata-rata ± standar deviasi.**
4. **Spreading Factor (SF):** Mengontrol laju transmisi data dalam LoRaWAN. SF lebih rendah = laju data lebih tinggi (waktu udara lebih singkat), SF lebih tinggi = sensitivitas penerima lebih baik namun laju data lebih rendah. **Ditampilkan sebagai distribusi jumlah dan persentase, bukan rata-rata.**
5. **Bandwidth:** Dalam pengujian ini dipilih 125 kHz.

---

## Proses Penelitian

- Instalasi dan konfigurasi kedua server LoRaWAN (ChirpStack lokal dan TTN publik).
- Implementasi perangkat DHT11 pada node uji.
- Pengumpulan data uplink dari kedua server.
- Ekstraksi data mentah (temperatur, kelembapan, RSSI, SNR, SF, timestamp) dari file CSV/JSON.
- Pengolahan data menggunakan perangkat lunak analisis statistik (misal: Python/pandas).
- Penghitungan PDR dengan membagi jumlah paket terdekode valid dengan jumlah paket yang dikirim (diestimasi dari frame counter atau ID pada data).
- Perhitungan rata-rata dan standar deviasi RSSI, SNR, serta frekuensi penggunaan masing-masing spreading factor.
- Uji-t dua sampel bebas untuk menentukan signifikansi statistik perbedaan antar-server.

---

# BAB 4: Hasil dan Analisis

## 4.1 Statistik Deskriptif

Hasil analisis menunjukkan perbedaan kinerja antara server ChirpStack lokal dan TTN. Secara umum, data PDR dari TTN jauh lebih tinggi daripada ChirpStack. Misalnya, untuk pengiriman setiap 120 detik:

- **PDR TTN ≈ 93.4%**
- **PDR ChirpStack ≈ 46.5%**

Hal serupa terlihat pada interval 240 detik (PDR TTN ≈ 92.8% vs ChirpStack ≈ 45.4%). Perbedaan besar ini mengindikasikan bahwa TTN berhasil menerima hampir seluruh paket uplink, sedangkan ChirpStack mengalami banyak kehilangan paket.

#### Tabel 4.1: Perbandingan Statistik Deskriptif Utama

| Metric            | ChirpStack         | TTN                |
|-------------------|--------------------|--------------------|
| PDR (120 dtk)     | 46.5%              | 93.4%              |
| PDR (240 dtk)     | 45.4%              | 92.8%              |
| RSSI (rata-rata)  | –48.6 dBm (±2.7)   | –39.3 dBm (±3.9)   |
| SNR (rata-rata)   | 9.39 dB (±1.05)    | 9.07 dB (±1.19)    |

**Catatan:**  
- PDR adalah persentase, bukan rata-rata.
- RSSI dan SNR adalah rata-rata ± standar deviasi.
- Distribusi SF dan jumlah data juga ditampilkan pada tabel/grafik lain.

Rata-rata RSSI pada TTN lebih baik (≈–39 dBm) dibanding ChirpStack (≈–48 dBm), menunjukkan sinyal yang diterima TTN lebih kuat. Nilai SNR rata-rata kedua server relatif mirip (sekitar 9 dB).

---

## 4.2 Perbandingan PDR

Perhitungan PDR dilakukan dengan membagi jumlah paket terdekode valid dengan total paket terkirim. Hasilnya, TTN memiliki PDR jauh lebih tinggi pada kedua pengaturan interval. Misalnya, untuk interval 120 detik diperoleh:

- **PDR TTN: 93.4%**
- **PDR ChirpStack: 46.5%**

Tingginya PDR TTN menunjukkan reliabilitas pengiriman paket yang lebih baik melalui infrastruktur TTN. ChirpStack lokal kehilangan hampir setengah paket, kemungkinan akibat konfigurasi validasi frame counter atau penerimaan sinyal yang lebih rendah.

---

## 4.3 Perbandingan RSSI dan SNR

Distribusi RSSI dan SNR dianalisis lebih lanjut. Median RSSI TTN lebih dekat ke nol (sinyal lebih kuat) dibanding ChirpStack, sedangkan median SNR kedua server relatif serupa. Uji-t independen menunjukkan perbedaan rata-rata RSSI dan SNR antara TTN dan ChirpStack signifikan secara statistik (p < 0,001).

---

## 4.4 Perbandingan Data Rate (Spreading Factor)

Analisis data rate melihat sebaran Spreading Factor (SF) yang digunakan. Hasil menunjukkan kedua server menggunakan SF yang sama karena berasal dari sumber data yang sama. Perangkat menggunakan ADR (Adaptive Data Rate), sehingga SF dapat berubah tergantung kondisi link.

#### Tabel 4.2: Distribusi Frame Berdasarkan Spreading Factor (SF)

| Platform   | SF7 | SF8 | SF10 |
|------------|-----|-----|------|
| ChirpStack | 0   | 0   | ~100%|
| TTN (120d) | 548 | 90  | 2    |
| TTN (240d) | 177 | 0   | 3    |

TTN dominan menerima pada SF7, menandakan jaringan (gateway) memiliki sensitivitas tinggi. ChirpStack menunjukkan nilai SF10 mayoritas, mungkin karena ADR lokal tidak menurunkan SF seagresif TTN.

---

## 4.5 Uji Statistik

Untuk memverifikasi signifikansi perbedaan, dilakukan uji-t independen pada metrik RSSI dan SNR. Hasil uji-t menunjukkan bahwa perbedaan rata-rata RSSI dan SNR antara ChirpStack dan TTN signifikan (p < 0,001). Perbedaan PDR yang besar secara praktis menunjukkan efektivitas TTN lebih tinggi dalam pengelolaan uplink LoRaWAN.

---

## Kesimpulan

Dari keseluruhan analisis, performa TTN unggul pada aspek reliabilitas pengiriman paket (PDR) dan kekuatan sinyal rata-rata (RSSI), sedangkan SNR kedua server relatif setara. Hal ini mengindikasikan perbedaan infrastruktur dan pengelolaan jaringan: TTN berbasis cloud kemungkinan memiliki gateway yang lebih kuat atau optimisasi jaringan yang lebih baik, sementara ChirpStack lokal rentan terhadap isu link dan validasi frame counter.

---

## Sumber

1. [What is Packet Delivery Ratio (PDR) | TEKTELIC Glossary](https://tektelic.com/what-it-is/packet-delivery-ratio/)
2. [Spreading Factors | The Things Network](https://www.thethingsnetwork.org/docs/lorawan/spreading-factors/)

_Data eksperimen diolah sendiri berdasarkan file yang diberikan._

**Catatan statistik:**  
Penulisan seperti `9.27 ± 1.27` adalah cara menampilkan statistik deskriptif untuk suatu metrik, misalnya SNR (Signal-to-Noise Ratio) atau RSSI (Received Signal Strength Indicator).  
Angka pertama (9.27) adalah nilai rata-rata (mean), sedangkan angka kedua (1.27) setelah tanda ± adalah standar deviasi (standard deviation).  
Jadi, "9.27 ± 1.27" berarti rata-rata nilai adalah 9.27 dan variasi (penyebaran) datanya sekitar 1.27 dari rata-rata tersebut.