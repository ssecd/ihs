import IHS from './ihs.js';

let instance: KFA | undefined;

export class KFA {
	constructor(private readonly ihs: IHS) {}

	/**
	 * Mendapatkan harga produk JKN.
	 * Menggunakan RestAPI KFA versi pertama.
	 */
	async getPriceJKN(params: {
		/** Isi dengan kode produk KFA yang diinginkan. */
		kfaCode: string;

		/** Isi dengan nomor halaman (page) yang diinginkan. Default to 1 */
		page?: number;

		/** Isi dengan banyaknya data yang ingin ditampilkan dalam satu halaman (page). Default to 10 */
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
					limit: String(params.limit || 10),
					kfa_code: params.kfaCode,
					region_code: params.regionCode || '',
					document_ref: params.documentRef || ''
				}
			});

			if (response.status < 500) {
				const json = <PriceJKN | ClientError>await response.json();
				json.error = !response.ok;
				return json;
			}

			const text = await response.text();
			throw new Error(text);
		} catch (error) {
			return asClientError(error);
		}
	}

	/**
	 * Mendapatkan detail produk.
	 * Menggunakan RestAPI KFA versi 2.
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
				json.error = !response.ok;
				return json;
			}

			const text = await response.text();
			throw new Error(text);
		} catch (error) {
			return asClientError(error);
		}
	}

	/**
	 * Pencarian daftar produk dengan paginasi.
	 * Menggunakan RestAPI KFA versi 2.
	 */
	async getProducts(params: {
		/** Isi dengan nomor halaman (page) yang diinginkan. Default to 1 */
		page?: number;

		/** Isi dengan banyaknya data yang ingin ditampilkan dalam satu halaman (page). Default to 10 */
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
					size: String(params.size || 10),
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
				json.error = !response.ok;
				return json;
			}

			const text = await response.text();
			throw new Error(text);
		} catch (error) {
			return asClientError(error);
		}
	}

	/**
	 * Mendapatkan varian alat kesehatan.
	 * Menggunakan RestAPI KFA versi 3.
	 */
	async getAlkesVariants(params?: GetAlkesParams) {
		try {
			const response = await this.ihs.request({
				type: 'kfa3',
				path: '/alkes/products',
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: asAlkesRequestBody(params)
			});

			if (response.status < 500) {
				const json = <AlkesResponseBody<AlkesVariantData[]>>await response.json();
				json.error = !response.ok;
				return json;
			}

			const text = await response.text();
			throw new Error(text);
		} catch (error) {
			return asAlkesError(error);
		}
	}

	/**
	 * Mendapatkan template alat kesehatan.
	 * Menggunakan RestAPI KFA versi 3.
	 */
	async getAlkesTemplates(params?: GetAlkesParams) {
		try {
			const response = await this.ihs.request({
				type: 'kfa3',
				path: '/alkes/template',
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: asAlkesRequestBody(params)
			});

			if (response.status < 500) {
				const json = <AlkesResponseBody<AlkesTemplateData[]>>await response.json();
				json.error = !response.ok;
				return json;
			}

			const text = await response.text();
			throw new Error(text);
		} catch (error) {
			return asAlkesError(error);
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
		error: true,
		detail: [{ loc: [], msg, type: 'unknown' }]
	};
}

function asAlkesError(error: unknown): AlkesResponseBody<null> {
	const msg = error instanceof Error ? error.message : JSON.stringify(error);
	return {
		status: 500,
		error: true,
		message: msg,
		data: null
	};
}

function asAlkesRequestBody(params?: GetAlkesParams) {
	const defaultParams = { page: 1, size: 10 };
	if (!params) return JSON.stringify(defaultParams);
	return JSON.stringify({
		page: params.page || defaultParams.page,
		size: params.size || defaultParams.size,
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
	error: true;
	detail: {
		loc: string[];
		msg: string;
		type: string;
	}[];
}

interface PriceJKN {
	error: false;
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
	error: false;
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
		uom: { cs_code?: string; name: string };

		dosage_form: ProductDetail['result']['farmalkes_type'];
		controlled_drug: ProductDetail['result']['farmalkes_type'];
		rute_pemberian: ProductDetail['result']['farmalkes_type'];

		produksi_buatan: string;
		nie: string;
		nama_dagang: string;
		manufacturer: string;
		registrar: string;
		generik: boolean | null;
		rxterm: number;
		dose_per_unit: number;
		fix_price: number;
		het_price: number;
		farmalkes_hscode: string | null;
		tayang_lkpp: boolean | null;
		kode_lkpp: string | null;
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
			parent_code: string | null;
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

		dosage_usage: {
			qty: number;
			name: string;
			period: number;
			qty_uom: string;
			category: string;
			duration: number;
			qty_high: number;
			qty_ucum: number | null;
			use_ucum: boolean;
			frequency: number;
			updated_at: string;
			period_ucum: string;
			display_name: string;
			duration_max: number;
			duration_ucum: string;
			frequency_max: number;
			body_weight_max: number;
			body_weight_min: number;
		}[];

		cvx_info: Record<string, unknown>;

		replacement: {
			product: { name: string | null; reason: string | null; kfa_code: string | null } | null;
			template: { name: string | null; reason: string | null; kfa_code: string | null } | null;
		};

		tags: { code: string | null; name: string | null }[];
	};
}

interface Product {
	error: false;
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
			generik: boolean | null;
			rxterm: number | null;
			dose_per_unit: 1;
			fix_price: number;
			het_price: number | null;
			farmalkes_hscode: string | null;
			tayang_lkpp: boolean;
			kode_lkpp: string | null;
			net_weight: number | null;
			net_weight_uom_name: string;
			volume: string | null;
			volume_uom_name: string;
			uom: { name: string };
			dosage_form: { code: string | null; name: string | null };
			product_template: {
				kfa_code: string;
				name: string;
				state: string;
				bmhp: boolean | null;
				active: boolean;
				display_name: string;
				updated_at: string;
			};
			active_ingredients: {
				state: string;
				active: boolean;
				kfa_code: string;
				zat_aktif: string;
				updated_at: string;
				kekuatan_zat_aktif: string;
			}[];
			replacement: {
				product: { name: string | null; reason: string | null; kfa_code: string | null } | null;
				template: { name: string | null; reason: string | null; kfa_code: string | null } | null;
			};
			tags: { code: string | null; name: string | null }[];
			paket_obat: {
				kfa_code: string | null;
				qty: number;
				uom_name: string | null;
				ucum_cs_code: string | null;
				ucum_name: string | null;
			}[];
			total_data: number;
		}[];
	};
}

interface GetAlkesParams {
	/** Isi dengan nomor halaman (page) yang diinginkan. Default to 1 */
	page?: number;

	/** Isi dengan banyaknya data raw yang ingin ditampilkan dalam satu halaman (page). Default to 10 */
	size?: number;

	/** Isi dengan state varian produk. Terdapat 2 option dalam varian produk `draft` dan `valid`. */
	state?: 'draft' | 'valid';

	/** Isi `true` atau `false` menunjukan data sudah terhapus atau belum */
	active?: boolean;

	/** Isi dengan kode kfa */
	kfaCode?: string;

	/**
	 * Isi dengan kode dari NIE BPOM/LKPP yang ada pada field identifier_ids[].code. Dapat diisi
	 * lebih dari satu yang dibatasi dengan 'koma'. Contoh: AKD 21501912107,2649566.
	 */
	referenceCode?: string;

	/** Isi dengan display_name, synonym, atau nama_dagang dalam pencarian fuzzy. Contoh: Surgical Gown. */
	search?: string;

	/** Isi dengan tanggal pencarian 'dari' format YYYY-MM-DD. */
	updatedFromDate?: string;

	/** Isi dengan tanggal pencarian 'sampai' format YYYY-MM-DD. */
	updatedToDate?: string;

	/** Isi dengan tipe kode yang sesuai dengan farmalkes_type.code. Dapat diisi lebih dari satu yang dibatasi dengan 'koma'. Contoh: `device,pkrt` */
	farmalkesType?: string;

	/** Isi dengan kode level 1 yang sesuai dengan kategori.code. Dapat diisi lebih dari satu yang dibatasi dengan 'koma'. Contoh: 02,03,04. */
	categoryCode?: string;

	/** Isi dengan kode level 2 yang sesuai dengan sub_kategori.code. Dapat diisi lebih dari satu yang dibatasi dengan 'koma'. Contoh: 0204,0205. */
	subCategoryCode?: string;

	/** Isi dengan kode level 3 yang sesuai dengan jenis.code. Dapat diisi lebih dari satu yang dibatasi dengan 'koma'. Contoh: 0204001,0204002. */
	typeCode?: string;

	/** Isi dengan kode level 4 yang sesuai dengan jenis.code. Dapat diisi lebih dari satu yang dibatasi dengan 'koma'. Contoh: 0204001003,0204001005. */
	subTypeCode?: string;
}

type AlkesResponseBody<T> = {
	status: number;
	message: string;
	data: T | null;
} & (
	| { error: true }
	| {
			error: false;
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
			};
	  }
);

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
	fix_price: number;
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
	lkpp_status: {
		freezed: boolean;
		reason_code: string | null;
		reason: string | null;
		remark: string | null;
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
