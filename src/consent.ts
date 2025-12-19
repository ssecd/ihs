import IHS from './ihs.js';

let instance: Consent | undefined;

export class Consent {
	constructor(private readonly ihs: IHS) {}

	/**
	 * Fungsi dari API ini adalah untuk mendapatkan data terkait resource Consent yang
	 * tersedia di ekosistem SatuSehat. Jika status 2xx return `Consent` dan selain
	 * itu return `OperationOutcome` termasuk status 5xx.
	 *
	 * @param patientId IHS patient id
	 * @returns FHIR resource `Consent` or `OperationOutcome`.
	 */
	async get(patientId: string) {
		try {
			const response = await this.ihs.request({
				type: 'consent',
				path: '/Consent',
				searchParams: [['patient_id', patientId]]
			});

			if (response.status >= 500) {
				throw new Error(await response.text());
			}
			return <fhir4.Consent | fhir4.OperationOutcome>await response.json();
		} catch (error) {
			return this.exception(error);
		}
	}

	/**
	 * Fungsi dari API ini adalah untuk melakukan perubahan data terkait resource Consent
	 * ke dalam ekosistem SatuSehat, yang sebelumnya sudah ditambahkan dan tersedia di
	 * dalam ekosistem SatuSehat. Jika status 2xx return `Consent` dan selain itu return
	 * `OperationOutcome` termasuk status 5xx.
	 *
	 * @returns FHIR resource `Consent` or `OperationOutcome`.
	 */
	async update(data: {
		/** IHS patient id yang akan dilakukan proses persetujuan */
		patientId: string;

		/**
		 * Aksi persetujuan yang akan dilakukan. Isi dengan `OPTIN` bila akses disetujui,
		 * sedangkan bila ditolak isi dengan `OPTOUT`. Persetujuan yang dimaksud adalah
		 * bersedia dan menyetujui data rekam medis milik pasien diakses dari Fasilitas
		 * Pelayanan Kesehatan lainnya melalui Platform SatuSehat untuk kepentingan
		 * pelayanan kesehatan dan/atau rujukan. **Tidak berarti** pengiriman data rekam
		 * medis tidak dilakukan jika pasien `OPTOUT`.
		 */
		action: 'OPTIN' | 'OPTOUT';

		/**
		 * Nama agen atau petugas yang ingin meminta persetujuan.
		 */
		agent: string;
	}) {
		try {
			const { patientId: patient_id, ...restData } = data;
			const response = await this.ihs.request({
				body: JSON.stringify({ patient_id, ...restData }),
				headers: { 'Content-Type': 'application/json' },
				type: 'consent',
				path: '/Consent',
				method: 'POST'
			});

			if (response.status >= 500) {
				throw new Error(await response.text());
			}
			return <fhir4.Consent | fhir4.OperationOutcome>await response.json();
		} catch (error) {
			return this.exception(error);
		}
	}

	private exception(error: unknown): fhir4.OperationOutcome {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const text = (error as any)?.message || 'unknown error';
		return {
			resourceType: 'OperationOutcome',
			issue: [
				{
					code: 'exception',
					severity: 'error',
					details: { text }
				}
			]
		};
	}
}

export function getConsentSingleton(...params: ConstructorParameters<typeof Consent>): Consent {
	if (!instance) instance = new Consent(...params);
	return instance;
}
