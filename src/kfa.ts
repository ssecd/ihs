import IHS from './ihs.js';

let instance: KFA | undefined;

export class KFA {
	constructor(private readonly ihs: IHS) {}

	/**
	 * Mendapatkan harga produk JKN
	 */
	async getPriceJKN(params: {
		/** Isi dengan kode produk KFA yang diinginkan. */
		kfaCode: string;

		/** Isi dengan nomor halaman (page) yang diinginkan. Default to 1 */
		page?: number;

		/** Isi dengan banyaknya data yang ingin ditampilkan dalam satu halaman (page). Default to 50 */
		limit?: number;

		/**
		 * Isi dengan kode regional JKN yang diinginkan.
		 * - regional1: Bali, Banten, Jawa Barat, Jawa Timur, Jakarta, Jawa Tengah, Lampung, Yogyakarta
		 * - regional2: Bangka Belitung, Bengkulu, Jambi, Nusa Tenggara Barat, Riau, Sumatra Barat, Sumatra Selatan, Sumatra Utara
		 * - regional3: Aceh, Kalimantan Barat, Kalimantan Timur, Kepulauan Riau, Kalimantan Tengah, Sulawesi Utara, Sulawesi Selatan, Sulawesi Tengah
		 * - regional4: Gorontalo, Kalimantan Tengah, Kalimantan Utara, Sulawesi Tenggara, Sulawesi Barat
		 * - regional5: Maluku, Maluku Utara, Nusa Tenggara Timur, Papua Barat
		 * - regional6: Papua Pegunungan, Papua Selatan, Papua Tengah
		 */
		regionCode?: `regional${1 | 2 | 3 | 4 | 5 | 6}`;

		/** Isi dengan dokumen referensi atau dasar hukum yang berlaku. */
		documentRef?: string;
	}) {
		try {
			const response = await this.ihs.request({
				type: 'kfa',
				path: '/farmalkes-price-jkn',
				searchParams: {
					page: String(params.page || 1),
					limit: String(params.limit || 50),
					kfa_code: params.kfaCode,
					region_code: params.regionCode || '',
					document_ref: params.documentRef || ''
				}
			});

			if (response.status < 500) {
				const json = <PriceJKN | ClientError>await response.json();
				json.success = response.ok;
				return json;
			}

			const text = await response.text();
			throw new Error(text);
		} catch (error) {
			return asClientError(error);
		}
	}

	/**
	 * Mendapatkan detail produk
	 */
	async getProductDetail(params: {
		/**
		 * Sumber data:
		 * - `nie` Data Nomor Izin Edar (NIE) yang bersumber dari BPOM.
		 * - `lkpp` Data inventaris, distribusi, pengelolaan, dan harga obat yang beredar
		 * bersumber dari Lembaga Kebijakan Pengadaan Barang/Jasa Pemerintah (LKPP).
		 * - `kfa` Data kode unik produk farmasi dan alat kesehatan yang bersumber pada
		 * Kamus Farmasi dan Alat Kesehatan (KFA).
		 */
		identifier: 'nie' | 'lkpp' | 'kfa';

		/** Isi kode dari produk yang akan dicari. */
		code: string;
	}) {
		try {
			const response = await this.ihs.request({
				type: 'kfa2',
				path: '/products',
				searchParams: params
			});

			if (response.status < 500) {
				const json = <ProductDetail | ClientError>await response.json();
				json.success = response.ok;
				return json;
			}

			const text = await response.text();
			throw new Error(text);
		} catch (error) {
			return asClientError(error);
		}
	}

	/**
	 * Pencarian daftar produk dengan paginasi
	 */
	async getProducts(params: {
		/** Isi dengan nomor halaman (page) yang diinginkan. Default to 1 */
		page?: number;

		/** Isi dengan banyaknya data yang ingin ditampilkan dalam satu halaman (page). Default to 50 */
		size?: number;

		/** Isi dengan kategori/jenis produk yang diinginkan. Contoh: farmasi. */
		productType: string;

		/** Isi dengan waktu mulai dengan format YYYY-MM-DD */
		fromDate?: string;

		/** Isi dengan waktu selesai dengan format YYYY-MM-DD */
		toDate?: string;

		/** Isi dengan kategori/jenis farmalkes yang diinginkan. */
		farmalkesType?: string;

		/** Isi dengan keyword yang diinginkan. Contoh: glove */
		keyword?: string;

		/** Isi dengan kode produk virtual/template (PAV) KFA yang diinginkan. */
		templateCode?: string;

		/** Isi dengan kode kemasan (PAK) KFA yang diinginkan. */
		packagingCode?: string;
	}) {
		try {
			const response = await this.ihs.request({
				type: 'kfa2',
				path: '/products/all',
				searchParams: {
					page: String(params.page || 1),
					size: String(params.size || 50),
					product_type: params.productType,
					from_date: params.fromDate || '',
					to_date: params.toDate || '',
					farmalkes_type: params.farmalkesType || '',
					keyword: params.keyword || '',
					template_code: params.templateCode || '',
					packaging_code: params.packagingCode || ''
				}
			});

			if (response.status < 500) {
				const json = <Product | ClientError>await response.json();
				json.success = response.ok;
				return json;
			}

			const text = await response.text();
			throw new Error(text);
		} catch (error) {
			return asClientError(error);
		}
	}

	async getAlkesVariants(params: GetAlkesParams) {
		try {
			const response = await this.ihs.request({
				type: 'kfa3',
				path: '/alkes/products',
				method: 'POST',
				body: asAlkesRequestBody(params)
			});

			if (response.status < 500) {
				const json = <AlkesResponseBody<AlkesVariantData[]> | ClientError>await response.json();
				json.success = response.ok;
				return json;
			}

			const text = await response.text();
			throw new Error(text);
		} catch (error) {
			return asClientError(error);
		}
	}

	async getAlkesTemplates(params: GetAlkesParams) {
		try {
			const response = await this.ihs.request({
				type: 'kfa3',
				path: '/alkes/template',
				method: 'POST',
				body: asAlkesRequestBody(params)
			});

			if (response.status < 500) {
				const json = <AlkesResponseBody<AlkesTemplateData[]> | ClientError>await response.json();
				json.success = response.ok;
				return json;
			}

			const text = await response.text();
			throw new Error(text);
		} catch (error) {
			return asClientError(error);
		}
	}
}

export function getKFASingleton(...params: ConstructorParameters<typeof KFA>) {
	if (!instance) instance = new KFA(...params);
	return instance;
}

function asClientError(error: unknown): ClientError {
	const msg = error instanceof Error ? error.message : JSON.stringify(error);
	return {
		success: false,
		detail: [{ loc: [], msg, type: 'unknown' }]
	};
}

function asAlkesRequestBody(params: GetAlkesParams) {
	return JSON.stringify({
		page: params.page || 1,
		size: params.size || 50,
		state: params.state,
		active: params.active,
		kfa_code: params.kfaCode,
		reference_code: params.referenceCode,
		search: params.search,
		updated_from_date: params.updatedFromDate,
		updated_to_date: params.updatedToDate,
		farmalkes_type: params.farmalkesType,
		category_code: params.categoryCode,
		sub_category_code: params.subCategoryCode,
		type_code: params.typeCode,
		sub_type_code: params.subTypeCode
	});
}

interface ClientError {
	success: false;
	detail: {
		loc: string[];
		msg: string;
		type: string;
	}[];
}

interface PriceJKN {
	success: true;
	total: number;
	page: number;
	limit: number;
	items: {
		data:
			| {
					product_template_name: string;
					kfa_code: string;
					document_ref: string;
					active: boolean;
					region_name: string;
					region_code: string;
					start_date: string;
					end_date: string | null;
					price_unit: number;
					uom_name: string;
					updated_at: string;
					uom_pack: string[];
					province: {
						province_code: string;
						province_name: string;
					}[];
			  }[]
			| null;
	};
}

interface ProductDetail {
	success: true;
	search_code: string;
	search_identifier: string;
	result: {
		name: string;
		kfa_code: string;
		active: boolean;
		state: string;
		image: string | null;
		updated_at: string;

		farmalkes_type: { code: string; name: string; group: string };
		ucum: { cs_code: string; name: string };

		dosage_form: ProductDetail['result']['farmalkes_type'];
		controlled_drug: ProductDetail['result']['farmalkes_type'];
		rute_pemberian: ProductDetail['result']['farmalkes_type'];

		uom: { name: string };

		produksi_buatan: string;
		nie: string;
		nama_dagang: string;
		manufacturer: string;
		registrar: string;
		generik: boolean;
		rxterm: string;
		dose_per_unit: number;
		fix_price: number;
		het_price: number;
		farmalkes_hscode: string | null;
		tayang_lkpp: boolean;
		kode_lkpp: string;
		score_tkdn: number | null;
		score_bmp: number | null;
		score_tkdn_bmp: number | null;

		med_dev_jenis: string | null;
		med_dev_subkategori: string | null;
		med_dev_kategori: string | null;
		med_dev_kelas_risiko: string | null;
		klasifikasi_izin: string | null;

		net_weight: number | null;
		net_weight_uom_name: string;
		volume: number | null;
		volume_uom_name: string;

		atc_ddd: {
			name: string;
			code: string;
			level: string;
			parent_code: string | boolean;
			comment: string | null;
		};

		atc_l1: ProductDetail['result']['atc_ddd'];
		atc_l2: ProductDetail['result']['atc_ddd'];
		atc_l3: ProductDetail['result']['atc_ddd'];
		atc_l4: ProductDetail['result']['atc_ddd'];
		atc_l5: ProductDetail['result']['atc_ddd'];

		description: string;
		indication: string;
		warning: string;
		side_effect: string;

		identifier_ids: {
			name: string;
			code: string;
			source_name: string;
			url: string | null;
		}[];

		packaging_ids: {
			name: string;
			kfa_code: string;
			pack_price: number;
			uom_id: string;
			qty: number;
		}[];

		product_template: {
			kfa_code: string;
			name: string;
			state: string;
			active: boolean;
			display_name: string;
			updated_at: string;
		};

		active_ingredients: {
			kfa_code: string;
			active: boolean;
			state: string;
			zat_aktif: string;
			kekuatan_zat_aktif: string;
			updated_at: string;
		}[];

		dosage_usage: string[];
		cvx_info: Record<string, unknown>;

		replacement: {
			product: string | null;
			template: string | null;
		};

		tags: string[];
	};
}

interface Product {
	success: true;
	total: number;
	page: number;
	size: number;
	items: {
		data: {
			name: string;
			kfa_code: string;
			active: boolean;
			state: string;
			image: string | null;
			updated_at: string;
			farmalkes_type: { code: string; name: string; group: string };
			produksi_buatan: string;
			nie: string | null;
			nama_dagang: string;
			manufacturer: string | null;
			registrar: string | null;
			generik: boolean;
			rxterm: string | null;
			dose_per_unit: 1;
			fix_price: 40499000.0;
			het_price: string | null;
			farmalkes_hscode: string | null;
			tayang_lkpp: boolean;
			kode_lkpp: string | null;
			net_weight: string | null;
			net_weight_uom_name: string;
			volume: string | null;
			volume_uom_name: string;
			uom: { name: string };
			dosage_form: { code: string | boolean; name: string | boolean };
			product_template: {
				kfa_code: string;
				name: string;
				state: string;
				active: boolean;
				display_name: string;
				updated_at: string;
			};
			active_ingredients: string[];
			replacement: {
				product: string | null;
				template: string | null;
			};
			tags: string[];
		}[];
	};
}

interface GetAlkesParams {
	/** Isi dengan nomor halaman (page) yang diinginkan. Default to 1 */
	page?: number;

	/** Isi dengan banyaknya data raw yang ingin ditampilkan dalam satu halaman (page). Default to 50 */
	size?: number;

	/** Isi dengan state varian produk. Terdapat 2 option dalam varian produk `draft` dan `valid`. */
	state: 'draft' | 'valid';

	/** Isi `true` atau `false` menunjukan data sudah terhapus atau belum */
	active: boolean;

	/** Isi dengan kode kfa */
	kfaCode: string;

	/**
	 * Isi dengan kode dari NIE BPOM/LKPP yang ada pada field identifier_ids[].code. Dapat diisi
	 * lebih dari satu yang dibatasi dengan 'koma'. Contoh: AKD 21501912107,2649566.
	 */
	referenceCode: string;

	/** Isi dengan display_name, synonym, atau nama_dagang dalam pencarian fuzzy. Contoh: Surgical Gown. */
	search: string;

	/** Isi dengan tanggal pencarian 'dari' format YYYY-MM-DD. */
	updatedFromDate: string;

	/** Isi dengan tanggal pencarian 'sampai' format YYYY-MM-DD. */
	updatedToDate: string;

	/** Isi dengan tipe kode yang sesuai dengan farmalkes_type.code. Dapat diisi lebih dari satu yang dibatasi dengan 'koma'. Contoh: `device,pkrt` */
	farmalkesType: string;

	/** Isi dengan kode level 1 yang sesuai dengan kategori.code. Dapat diisi lebih dari satu yang dibatasi dengan 'koma'. Contoh: 02,03,04. */
	categoryCode: string;

	/** Isi dengan kode level 2 yang sesuai dengan sub_kategori.code. Dapat diisi lebih dari satu yang dibatasi dengan 'koma'. Contoh: 0204,0205. */
	subCategoryCode: string;

	/** Isi dengan kode level 3 yang sesuai dengan jenis.code. Dapat diisi lebih dari satu yang dibatasi dengan 'koma'. Contoh: 0204001,0204002. */
	typeCode: string;

	/** Isi dengan kode level 4 yang sesuai dengan jenis.code. Dapat diisi lebih dari satu yang dibatasi dengan 'koma'. Contoh: 0204001003,0204001005. */
	subTypeCode: string;
}

interface AlkesResponseBody<T> {
	success: true;
	status: number;
	error: boolean;
	message: string;
	meta: {
		item_count: number;
		page: {
			is_cursor: boolean;
			current: number;
			previous: number;
			next: number;
			limit: number;
			total: number;
		};
		sort: string | null;
		param: string | null;
		data: T;
	};
}

interface AlkesVariantData {
	kfa_code: string;
	active: boolean;
	barcode: string;
	dapat_dibeli_lkpp: boolean;
	discontinued: boolean;
	display_name: string;
	farmalkes_type: {
		code: string;
		name: string;
		group: string;
	};
	fix_price: 81082633;
	fornas: boolean;
	identifier_ids: {
		url: string | null;
		code: string;
		name: string;
		use: string;
		end_date: string | null;
		start_date: string | null;
		source_code: string;
		source_name: string;
	}[];
	jenis: {
		code: string;
		name: string;
	};
	kategori: {
		code: string;
		name: string;
	};
	klasifikasi_izin: {
		code: string;
		name: string;
		type: string;
	};
	kode_kbki: string;
	kode_lkpp: string;
	manufacturer: string;
	manufacturer_country: {
		code: string;
		name: string;
	};
	med_dev_kelas_risiko: string;
	nama_dagang: string;
	nie: string;
	product_template: {
		state: string;
		kfa_code: string;
		name: string;
		bmhp: boolean;
		synonyms: string;
	};
	produksi_buatan: string;
	registrar: string;
	registrar_country: {
		code: string;
		name: string;
	};
	score_bmp: number;
	score_tkdn: number;
	score_tkdn_bmp: number;
	stok_wajib_yankes: boolean;
	sub_jenis: {
		code: string;
		name: string;
	};
	sub_kategori: {
		code: string;
		name: string;
	};
	tayang_lkpp: boolean;
	ucum: {
		name: string;
		ci_code: string;
		cs_code: string;
	};
	uom_name: string;
	uom_po_name: string;
	updated_at: string;
	variant_desc_farmalkes: string;
	variant_desc_usage: string;
	variant_desc_warning: string;
	variant_side_effect: string;
	volume: number;
	weight: number;
	product_state: string;
	replacement: {
		product: {
			reason: string;
			kfa_code: string;
		};
		template: {
			reason: string;
			kfa_code: string;
		};
	};
}

interface AlkesTemplateData {
	kfa_code: string;
	active: boolean;
	bmhp: boolean;
	desc_farmalkes: string;
	desc_usage: string;
	desc_warning: string;
	farmalkes_hscode: string;
	farmalkes_type: {
		code: string;
		name: string;
		group: string;
	};
	fornas: boolean;
	jenis: {
		code: string;
		name: string;
	};
	kategori: {
		code: string;
		name: string;
	};
	klasifikasi_izin: {
		code: string;
		name: string;
		type: string;
	};
	med_dev_kelas_risiko: string;
	name: string;
	replacement: {
		name: string;
		reason: string;
		kfa_code: string;
	};
	side_effect: string;
	state: string;
	stok_wajib_yankes: boolean;
	sub_jenis: {
		code: string;
		name: string;
	};
	sub_kategori: {
		code: string;
		name: string;
	};
	synonyms: string;
	ucum: {
		name: string;
		ci_code: string;
		cs_code: string;
	};
	uom_name: string;
	uom_po_name: string;
	updated_at: string;
}
