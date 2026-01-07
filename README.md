Indonesia Health Service API Helpers

- ✅ Automatic authentication and token invalidation
- ✅ TypeSafe and Autocomplete-Enabled API
- ✅ FHIR
- ✅ Patient Consent
- ✅ KYC
- ✅ KFA
- 🏗️ MSI
- 🏗️ Wilayah

## Instalasi

Instalasi paket dapat dilakukan dengan perintah berikut:

```bash
npm install @ssecd/ihs
```

Untuk dukungan _type safe_ pada API FHIR, perlu menambahkan development dependensi `@types/fhir` dengan perintah:

```bash
npm install --save-dev @types/fhir
```

Instalasi juga dapat dilakukan menggunakan `PNPM` atau `YARN`

## Penggunaan

### Inisialisasi

Penggunaan paket ini sangatlah sederhana, cukup menginisialisasi global instansi pada sebuah modul atau file seperti berikut:

```ts
// file: ihs.ts atau ihs.js
import IHS from '@ssecd/ihs';

const ihs = new IHS();

export default ihs;
```

Secara default konfigurasi seperti **Client Secret** atau **Secret Key** akan dibaca melalui environment variable namun konfigurasi juga dapat diatur pada constructor class seperti berikut:

```ts
const ihs = new IHS({
	clientSecret: '<client secret dari platform SatuSehat>',
	kycPemFile: `/home/user/kyc-publickey.pem`
	// dan seterusnya
});
```

Selain menggunakan objek, konfigurasi juga dapat diatur menggunakan fungsi, misalnya pada kasus membaca atau mendapatkan konfigurasi dari database:

```ts
const ihs = new IHS(async () => {
	const config = await sql`select * from config`;
	return {
		clientSecret: config.clientSecret
		// dan seterusnya ...
	};
});
```

Perlu diperhatikan bahwa fungsi config pada constructor parameter tersebut hanya akan dipanggil satu kali. Bila terjadi perubahan konfigurasi harap memanggil fungsi `invalidateConfig()` pada instansi IHS untuk memperbaharui atau menerapkan perubahan konfigurasi.

```ts
await ihs.invalidateConfig();
```

Konfigurasi lengkapnya dapat dilihat di bagian [Konfigurasi](#konfigurasi).

### Autentikasi

Proses autentikasi dan re-autentikasi dilakukan secara otomatis pada saat melakukan request di masing-masing API. Autentikasi terjadi hanya ketika tidak terdapat token atau token sudah kedaluwarsa.

Meski demikian, autentikasi juga dapat dilakukan secara manual jika sewaktu-waktu memerlukan informasi dari response autentikasi melalui instansi `IHS` dengan memanggil method `auth()` dengan kembalian berupa type `AuthDetail` yang berisi informasi autentikasi termasuk nilai `access_token`, `expires_in`, `issued_at` dan lainnya sesuai dengan spesifikasi IHS.

```ts
import ihs from './path/to/ihs.js';

const detail: AuthDetail = await ihs.auth();
```

Pada instance IHS, secara default detail autentikasi disimpan ke dalam _process memory_ sebagai cache dan diperiksa waktu kedaluwarsa-nya setiap kali akan melakukan request. Informasi autentikasi perlu di-cache untuk menghindari terjadinya proses autentikasi yang berulang-ulang. Hal ini dikarenakan service autentikasi memiliki _rate limit_ <ins>hanya satu kali request dalam satu menit</ins> (saat dokumentasi ini dibuat). Namun, menyimpan cache di _process memory_ akan menjadi masalah di _[cluster](https://nodejs.org/api/cluster.html) mode_ karena saat ini belum ada dukungan untuk _shared memory_ saat menggunakan _cluster mode_. Untuk masalah ini dapat diatasi dengan membuat _custom store_ untuk menyimpan atau men-cache informasi autentikasi ke database seperti [Redis](https://redis.io/):

```ts
// file: ihs.ts atau ihs.js

import IHS, { AuthStore } from '@ssecd/ihs';
import redis from '/path/to/redis-instance.js';

class RedisAuthStore implements AuthStore {
	private readonly CACHE_KEY = 'my-ihs-auth-cache-key';

	async set(detail: AuthDetail): Promise<void> {
		const { issued_at, expires_in } = detail;
		const anticipate = 300; // seconds
		const ttl = +issued_at + (+expires_in - anticipate) * 1000 - Date.now();
		await redis.set(this.CACHE_KEY, JSON.stringify(detail), 'PX', ttl);
	}

	async get(): Promise<AuthDetail | undefined> {
		const plain = await redis.get(this.CACHE_KEY);
		return plain ? JSON.parse(plain) : undefined;
	}
}

const ihs = new IHS();

ihs.authStore = new RedisAuthStore();

export default ihs;
```

### Patient Consent

Pada Patient Consent, terdapat dua buah method yang di-definisikan sesuai dengan spesifikasi IHS yakni method untuk mendapatkan informasi consent pasien:

```ts
const result = await ihs.consent.get('P02478375538');

if (result.resourceType === 'Consent') {
	console.info(result); // Consent resource
} else {
	console.error(result); // OperationOutcome resource
}
```

dan method untuk memperbarui informasi consent pasien:

```ts
const result = await ihs.consent.update({
	patientId: 'P02478375538',
	action: 'OPTIN',
	agent: 'Nama Agen'
});

if (result.resourceType === 'Consent') {
	console.info(result); // Consent resource
} else {
	console.error(result); // OperationOutcome resource
}
```

Setiap method pada Patient Consent API ini memiliki nilai kembalian FHIR resource `Consent` jika request sukses dan `OperationOutcome` jika request gagal.

### FHIR

Pada API ini, implementasi-nya sangat sederhana dan mengutamakan fleksibilitas yakni dengan hanya mengembalikan `Response` object sehingga response sepenuhnya di-_handle_ pengguna.

```ts
const response: Response = await ihs.fhir(`/Patient`, {
	searchParams: {
		identifier: 'https://fhir.kemkes.go.id/id/nik|9271060312000001',
		gender: 'male'
	}
});

if (response.ok) {
	const patientBundle: fhir4.Bundle<fhir4.Patient> = await response.json();
	console.info(patientBundle); // Bundle<Patient>
}
```

### KYC

Pada API ini, terdapat dua buah method yakni method untuk melakukan proses Generate URL Validasi di mana URL digunakan untuk melakukan verifikasi akun SatuSehat melalui SatuSehat Mobile:

```ts
const result = await ihs.kyc.generateValidationUrl({
	name: 'Nama Agen',
	nik: 'NIK Agen'
});

if ('error' in result.data) {
	console.error(result.data.error); // Request error message
} else {
	console.info(result.data);
	/*
	{
		agent_name: string;
		agent_nik: string;
		token: string;
		url: string;
	}
	*/
}
```

dan method untuk melakukan proses Generate Kode Verifikasi di mana nilai tersebut akan muncul di SatuSehat Mobile (SSM) dan digunakan oleh pasien untuk proses validasi:

```ts
const result = await ihs.kyc.generateVerificationCode({
	nik: 'NIK Pasien',
	name: 'Nama Pasien'
});

if ('error' in result.data) {
	console.error(result.data.error); // Request error message
} else {
	console.info(result.data);
	/*
	{
		nik: string;
		name: string;
		ihs_number: string;
		challenge_code: string;
		created_timestamp: string;
		expired_timestamp: string;
	}
	*/
}
```

Setiap method pada API ini memiliki parameter dan nilai kembalian yang di-definisikan sesuai dengan spesifikasi IHS pada Playbook.

Proses enkripsi dan dekripsi pesan dilakukan dengan menggunakan algoritma `aes-256-gcm` sedangkan untuk proses enkripsi dan dekripsi _symmetric key_ menggunakan metode RSA dengan `RSA_PKCS1_OAEP_PADDING` padding dan `sha256` hash. Semua proses tersebut sudah dilakukan secara internal sesuai dengan spesifikasi IHS pada Playbook.

Proses kriptografi pada API ini memerlukan file _server key_ atau _public key_ dengan format `.pem`. File _public key_ ini dapat disesuaikan lokasinya dengan mengatur `kycPemFile` pada config instance atau class `IHS` yang secara default bernama `publickey.sandbox.pem` pada mode `sandbox` atau `publickey.pem` pada mode `production` dan berada di _working directory_ atau folder di mana API dijalankan.

File _public key_ atau _server key_ dapat di-unduh di [sini](https://github.com/ssecd/ihs/issues/2).

### KFA

API KFA atau Kamus Farmasi & Alat Kesehatan ini diimplementasikan sesuai dengan spesifikasi IHS pada Playbook yang mana memiliki beberapa versi yakni `kfa`, `kfa-v2`, dan `kfa-v3`. Semua RestAPI yang tersedia sudah dibungkus pada method sehingga mempermudah pemanggilan API dan penulisan tipe request dan response.

```ts
const result1 = await ihs.kfa.getProducts({ ... });
if (result1.error) {
	// result == ClientError
} else {
	// result == Product
}

const result2 = await ihs.kfa.getAlkesVariants({ ... });
if (result2.error) {
	// result == AlkesResponseBody<null>
} else {
	// result == AlkesResponseBody<AlkesVariantData[]>
}
```

### `ihs.request({ ... })`

Request ke RestAPI secara langsung menggunakan method `request()` dari instansi `IHS`.

## Konfigurasi

Konfigurasi mengikuti interface berikut:

```ts
interface IHSConfig {
	/**
	 * Client secret dari Akses Kode API di Platform SatuSehat
	 *
	 * @default process.env.IHS_CLIENT_SECRET
	 */
	clientSecret: string;

	/**
	 * Secret key dari Akses Kode API di Platform SatuSehat
	 *
	 * @default process.env.IHS_SECRET_KEY
	 */
	secretKey: string;

	/**
	 * Mode environment API antara `sandbox` atau `production`,
	 * `sandbox` secara default
	 *
	 * @default process.env.NODE_ENV || 'sandbox'
	 */
	mode: Mode;

	/**
	 * Path atau lokasi public key KYC dari SatuSehat. Dapat
	 * menggunakan absolute atau relative path. Secara default
	 * akan membaca nilai environment variable IHS_KYC_PEM_FILE
	 * atau `publickey.sandbox.pem` pada mode `sandbox` dan
	 * `publickey.pem` pada mode `production`
	 *
	 * @default process.env.IHS_KYC_PEM_FILE
	 */
	kycPemFile: string;
}
```

## Kontribusi

Kontribusi sangat dipersilakan dan dapat dilakukan dengan berbagai cara seperti melaporkan masalah, membuat permintaan atau menambahkan fitur melalui PR, atau sekedar memperbaiki kesalahan ketikan.

## Lisensi

[MIT](./LICENSE)

## Lainnya

- [Pemecahan Masalah](https://github.com/ssecd/ihs/issues?q=is%3Aissue)
- [Laporkan Bug](https://github.com/ssecd/ihs/issues/new)
