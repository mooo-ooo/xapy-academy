import type { Locale } from "@/i18n/routing";

/**
 * File-based glossary — small enough (< ~100 terms) that DB tables
 * are overkill. Curate inline; commit changes through PRs.
 *
 * Add a new term: extend `ENTRIES`, write definitions per supported locale.
 * Missing locales fall back to English at read-time.
 */

type GlossaryDefinition = {
  term: string;
  /** Short one-line summary used in DefinedTerm JSON-LD. */
  short: string;
  /** Longer prose body (Markdown allowed in renderer — kept HTML-safe). */
  long: string;
  /** Alternate spellings / synonyms for the AI schema. */
  aliases?: string[];
};

export type GlossaryEntry = {
  slug: string;
  /** Bag of definitions keyed by locale; "en" guaranteed to exist. */
  byLocale: Partial<Record<Locale, GlossaryDefinition>> & {
    en: GlossaryDefinition;
  };
};

const ENTRIES: GlossaryEntry[] = [
  {
    slug: "delta",
    byLocale: {
      en: {
        term: "Delta",
        short:
          "Difference between aggressive buy volume and aggressive sell volume over a window.",
        long: "Delta is the net of market buyers consuming offers minus market sellers consuming bids. Positive delta means aggressors lifted offers; negative means they hit bids. Used as a flow-confirmation tool alongside price structure.",
        aliases: ["cumulative delta", "Δ"],
      },
      vi: {
        term: "Delta",
        short:
          "Hiệu giữa khối lượng mua chủ động và khối lượng bán chủ động trong một khung.",
        long: "Delta là chênh lệch giữa lực mua nuốt ask và lực bán nuốt bid trong một khung thời gian. Delta dương = aggressor đang mua; âm = aggressor đang bán. Dùng để xác nhận dòng tiền song song với cấu trúc giá.",
        aliases: ["cumulative delta", "Δ"],
      },
    },
  },
  {
    slug: "vwap",
    byLocale: {
      en: {
        term: "VWAP",
        short:
          "Volume-Weighted Average Price — the running average price weighted by traded volume.",
        long: "VWAP is recalculated tick-by-tick from a reference start (usually session open). Institutional execution algorithms benchmark fills against VWAP; mean-reversion traders use it as a magnet level.",
        aliases: ["Volume-Weighted Average Price"],
      },
      vi: {
        term: "VWAP",
        short:
          "Giá trung bình có trọng số khối lượng — running average trọng số theo volume.",
        long: "VWAP được tính lại theo từng tick từ một mốc đầu phiên. Các thuật toán execution lớn benchmark giá khớp lệnh với VWAP; trader mean-reversion coi nó như đường nam châm.",
        aliases: ["Volume-Weighted Average Price"],
      },
    },
  },
  {
    slug: "liquidity",
    byLocale: {
      en: {
        term: "Liquidity",
        short:
          "Depth of resting orders available to absorb incoming market flow.",
        long: "Liquidity describes how easily a position can be entered or exited without moving the price. Thick books absorb size; thin books cascade. Order-flow traders track liquidity migrations to anticipate stop runs and rejection points.",
      },
      vi: {
        term: "Thanh khoản",
        short:
          "Độ dày lệnh chờ sẵn để hấp thụ dòng lệnh chủ động đang vào.",
        long: "Thanh khoản đo độ dễ vào/ra một vị thế mà không làm dịch giá. Sổ lệnh dày hấp thụ size; mỏng thì cascade. Trader order-flow theo dõi sự dịch chuyển thanh khoản để dự đoán stop-run và điểm rejection.",
      },
    },
  },
  {
    slug: "order-flow",
    byLocale: {
      en: {
        term: "Order flow",
        short:
          "The real-time stream of executed trades and book changes used to read intent.",
        long: "Order-flow analysis means reading the tape itself — every print, every limit pull, every aggressive sweep — to infer who is in control. The complement to chart-based technical analysis.",
      },
      vi: {
        term: "Order flow",
        short:
          "Dòng lệnh khớp và biến động sổ lệnh theo thời gian thực để đọc ý đồ thị trường.",
        long: "Phân tích order flow tức là đọc tape: từng print, từng lệnh limit bị kéo, từng đợt sweep chủ động — để biết ai đang kiểm soát. Bổ trợ cho phân tích kỹ thuật trên biểu đồ.",
      },
    },
  },
  {
    slug: "tpo",
    byLocale: {
      en: {
        term: "TPO",
        short:
          "Time-Price Opportunity — letter-based market profile chart marking how long price spent at each level.",
        long: "Each 30-minute period gets a letter; stacking them across price builds the day's profile shape. The fattest part is the value area; the apex(es) of single prints mark transition zones.",
        aliases: ["Time Price Opportunity"],
      },
      vi: {
        term: "TPO",
        short:
          "Time-Price Opportunity — biểu đồ market profile dạng chữ cái thể hiện thời gian giá lưu lại từng mức.",
        long: "Mỗi khung 30 phút gắn một chữ cái; xếp chồng theo giá tạo nên hình profile cả ngày. Phần dày nhất là value area; những điểm single print đánh dấu vùng chuyển giao.",
        aliases: ["Time Price Opportunity"],
      },
    },
  },
  {
    slug: "footprint",
    byLocale: {
      en: {
        term: "Footprint chart",
        short:
          "Bar chart that exposes bid×ask volume inside each candle.",
        long: "Footprints split each bar into per-price rows showing trades on the bid vs ask. Imbalances and high-volume nodes inside the bar become the actionable signal, not the OHLC alone.",
      },
      vi: {
        term: "Footprint chart",
        short:
          "Biểu đồ nến để lộ khối lượng bid×ask bên trong mỗi bar.",
        long: "Footprint chia mỗi bar thành các dòng theo giá, hiển thị lệnh khớp bên bid vs ask. Imbalance và node khối lượng cao bên trong bar trở thành tín hiệu chính, không chỉ dựa vào OHLC.",
      },
    },
  },
  {
    slug: "imbalance",
    byLocale: {
      en: {
        term: "Imbalance",
        short:
          "A skewed trade ratio between bid and ask at a price, often >= 3:1.",
        long: "Stacked imbalances point to who is in control inside a swing. Algo systems flag them automatically; reading them in context (level + time of day + delta) separates noise from signal.",
      },
      vi: {
        term: "Imbalance",
        short:
          "Tỷ lệ khớp lệch giữa bid và ask tại một mức, thường ≥ 3:1.",
        long: "Imbalance xếp chồng cho biết ai đang kiểm soát trong một swing. Các hệ thống algo gắn cờ tự động; đọc theo bối cảnh (level + giờ + delta) mới tách được nhiễu khỏi tín hiệu.",
      },
    },
  },
];

export function listGlossaryEntries(locale: Locale) {
  return ENTRIES.map((e) => {
    const def = e.byLocale[locale] ?? e.byLocale.en;
    return { slug: e.slug, ...def };
  }).sort((a, b) => a.term.localeCompare(b.term, locale));
}

export function getGlossaryEntry(slug: string, locale: Locale) {
  const e = ENTRIES.find((x) => x.slug === slug);
  if (!e) return null;
  const def = e.byLocale[locale] ?? e.byLocale.en;
  return { slug: e.slug, ...def };
}
