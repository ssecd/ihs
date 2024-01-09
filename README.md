Indonesia Health Service API Helpers

- ✅ FHIR API
- ✅ Patient Consent API
- ✅ KYC API
- ✅ Automatic authentication and token invalidation

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

TODO

### Autentikasi

Proses autentikasi dan re-autentikasi dilakukan secara otomatis pada saat melakukan request di masing-masing API. Autentikasi terjadi hanya ketika tidak terdapat token atau token sudah kedaluwarsa.

Meski demikian, autentikasi juga dapat dilakukan secara manual jika sewaktu-waktu memerlukan informasi dari response autentikasi melalui instansi `IHS` dengan memanggil method `auth()` dengan kembalian berupa type `AuthDetail` yang berisi informasi autentikasi termasuk nilai `access_token`, `expires_in`, `issued_at` dan lainnya sesuai dengan spesifikasi IHS.

```ts
import ihs from './path/to/ihs.js';

const detail: AuthDetail = await ihs.auth();
```

### Consent

TODO

### FHIR

TODO

### KYC

TODO

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
	 * Mode environment API antara `development` ata `production`
	 *
	 * @default process.env.NODE_ENV || 'development'
	 */
	mode: Mode;

	/**
	 * Path atau lokasi public key KYC dari SatuSehat. Dapat
	 * menggunakan absolute atau relative path. Secara default
	 * akan membaca nilai environment variable IHS_KYC_PEM_FILE
	 * atau `publickey.dev.pem` pada mode `development` dan
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
