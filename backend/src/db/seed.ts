import { randomUUID } from "node:crypto";
import { db } from "./index";

interface SpeciesSeed {
  common_name: string;
  scientific_name: string;
  category: "shrub" | "tree" | "grass" | "forb" | "vine" | "shrub/tree";
  id_summary: string;
  id_key_tell: string;
  removal_summary: string;
  best_timing: string;
  herbicide_notes: string;
  source_links: string[];
  /** Months (1-12) considered the optimal removal window, derived from best_timing. Empty = no clear window. */
  active_months: number[];
}

const SPECIES: SpeciesSeed[] = [
  {
    common_name: "Bush honeysuckle (Amur / Tatarian)",
    scientific_name: "Lonicera maackii, L. tatarica",
    category: "shrub",
    id_summary:
      "Upright multi-stemmed shrub, 15-20 ft; paired ~3/4-inch flowers Apr-June (Amur white-yellow, Tatarian pink-white); 1/4-inch red berries late summer, persisting through winter; opposite simple leaves.",
    id_key_tell: "Leafs out earlier than natives and holds green leaves later into fall; hollow stems.",
    removal_summary:
      "Hand-pull small plants in moist soil (shallow-rooted). Large: cut-stump, 20-25% triclopyr ester in oil within ~10 min of cutting. Basal bark: triclopyr ester in basal oil on lower 12-15 in (stems <=2 in).",
    best_timing: "Fall (Oct-Nov) - easy to ID, low non-target damage. Basal bark effective any season.",
    herbicide_notes: "Triclopyr (Garlon/Remedy) is broadleaf-selective, spares grass. Add dye.",
    source_links: [
      "https://extension.illinois.edu/blogs/good-growing/2024-11-29-identify-and-manage-invasive-bush-honeysuckle",
      "https://extension.psu.edu/shrub-honeysuckles",
      "https://besjournals.onlinelibrary.wiley.com/doi/full/10.1002/2688-8319.12332",
      "https://bookstore.ksre.ksu.edu/pubs/economical-control-of-bush-honeysuckle_MF3222.pdf",
      "https://eupdate.agronomy.ksu.edu/eu_article_prep.php?article_id=2819",
    ],
    active_months: [10, 11],
  },
  {
    common_name: "Sericea lespedeza (Chinese bush clover)",
    scientific_name: "Lespedeza cuneata",
    category: "forb",
    id_summary:
      "Shrubby perennial forb 2-5 ft; trifoliate, wedge/club-shaped leaflets; cream flowers with a single purple patch, blooming June/Aug-frost.",
    id_key_tell: "Leaflets have parallel veins (native lespedezas do not) - the reliable distinguisher.",
    removal_summary:
      "Herbicide almost always required; combine with burn/graze/mow. Early summer (vegetative): Remedy Ultra 1-1.5 pt/ac or PastureGard HL. Late summer (blooming): metsulfuron (Escort XP ~0.5 oz/ac). Spot: 1% Remedy Ultra.",
    best_timing:
      "June-early July (vegetative) OR Aug-Sept (blooming). Treat before mid-seed-fill. Avoid drought stress. Retreat every 2-4 yrs.",
    herbicide_notes: "Metsulfuron may stunt tall fescue; use non-ionic surfactant.",
    source_links: [
      "https://www.no-tillfarmer.com/articles/6803-controlling-sericea-lespedeza-in-rangeland-pasture-and-crp",
      "https://www.farmprogress.com/management/sericea-lespedeza-control-time-is-now",
      "https://www.thebeefsite.com/news/19414/late-summer-is-good-time-to-control-sericea-lesepdeza",
      "https://eupdate.agronomy.ksu.edu/article/world-of-weeds-sericea-lespedeza-668-4",
      "https://bookstore.ksre.ksu.edu/download/sericea-lespedeza-history-characteristics-and-identification_MF2408",
    ],
    active_months: [6, 7, 8, 9],
  },
  {
    common_name: "Callery / Bradford pear",
    scientific_name: "Pyrus calleryana",
    category: "tree",
    id_summary:
      "Small tree <=40 ft; showy white 5-petal flowers early spring before leaves; glossy leaves turning red/purple in fall; weak branch structure.",
    id_key_tell:
      "Flowers smell foul, not sweet. Cultivars: Bradford, Cleveland Select, Aristocrat, Chanticleer.",
    removal_summary:
      "Zero tolerance; resprouts vigorously, mowing ineffective. Pull small saplings in moist soil (thorns). Cut-stump: triclopyr or glyphosate to cut surface within ~15 min-2 hr. Basal bark (<=6 in): 25% triclopyr ester + 75% crop oil, lower 12 in, full circumference.",
    best_timing:
      "Late summer-early fall for herbicide. Cut before fruit sets (spring/early summer) to stop seed. Basal bark uptake best late winter/early spring or summer.",
    herbicide_notes: "Cut-stump triclopyr gave ~100% mortality in a multi-state (incl. Kansas) study.",
    source_links: [
      "https://www.uaex.uada.edu/counties/white/news/horticulture/bradford-pear.aspx",
      "https://www.dnr.state.mn.us/invasives/terrestrialplants/callery-pear.html",
      "https://www.cambridge.org/core/journals/invasive-plant-science-and-management/article/efficacy-of-herbicides-and-application-methods-for-management-of-midstory-callery-pear-pyrus-calleryana/6D83B712F5A626495C559D5282CADF4D",
      "https://mdc.mo.gov/trees-plants/invasive-plants/callery-pear-control",
      "https://www.kansasforests.org/forestry/invasivewoodyplants.html",
    ],
    active_months: [8, 9, 10],
  },
  {
    common_name: "Tree-of-heaven",
    scientific_name: "Ailanthus altissima",
    category: "tree",
    id_summary: "Fast-growing tree with compound leaves and a strong, unpleasant odor when crushed. Reference-only row — consult local extension guidance before treating.",
    id_key_tell: "Leaflets have a gland tooth near the base; crushed foliage smells rank (like burnt peanut butter/cashew).",
    removal_summary: "Prone to prolific resprouting and root suckering; cutting alone often worsens infestations. Herbicide (foliar or basal bark/cut-stump) generally required.",
    best_timing: "Late summer, when the tree is translocating to roots.",
    herbicide_notes: "Read the label; this app records what you did, it does not prescribe treatment.",
    source_links: ["https://www.kansasforests.org/forestry/invasivewoodyplants.html"],
    active_months: [8, 9],
  },
  {
    common_name: "Saltcedar / tamarisk",
    scientific_name: "Tamarix ramosissima",
    category: "shrub/tree",
    id_summary: "Riparian shrub/small tree with scale-like leaves and dense pink-white flower spikes. Reference-only row.",
    id_key_tell: "Scale-like, juniper-esque foliage on slender branches; found along streams and disturbed riparian areas.",
    removal_summary: "Mechanical removal plus follow-up herbicide (cut-stump or basal bark) typically needed given resprouting.",
    best_timing: "Growing season for foliar treatment; consult local riparian-area guidance.",
    herbicide_notes: "Read the label; riparian sites may have additional aquatic-label restrictions.",
    source_links: ["https://www.agriculture.ks.gov/divisions-programs/plant-protection-weed-control/noxious-weed-control-program/kansas-noxious-weed-list"],
    active_months: [],
  },
  {
    common_name: "Russian olive",
    scientific_name: "Elaeagnus angustifolia",
    category: "tree",
    id_summary: "Small tree with silvery-gray leaves and thorny branches. Reference-only row.",
    id_key_tell: "Leaves are silvery on both sides; fragrant yellow flowers in spring; thorned twigs.",
    removal_summary: "Cut-stump or basal bark herbicide application; mechanical removal alone leads to resprouting.",
    best_timing: "Late summer-fall for herbicide application.",
    herbicide_notes: "Read the label before treatment.",
    source_links: ["https://www.kansasforests.org/forestry/invasivewoodyplants.html"],
    active_months: [8, 9, 10],
  },
  {
    common_name: "Autumn olive",
    scientific_name: "Elaeagnus umbellata",
    category: "shrub",
    id_summary: "Deciduous shrub with silvery-scaled leaf undersides and red speckled berries. Reference-only row.",
    id_key_tell: "Leaf undersides are silvery-scaled; fruit is small, red, and speckled in fall.",
    removal_summary: "Cut-stump or basal bark herbicide; hand-pull small seedlings in moist soil.",
    best_timing: "Late summer-fall for herbicide application.",
    herbicide_notes: "Read the label before treatment.",
    source_links: ["https://www.kansasforests.org/forestry/invasivewoodyplants.html"],
    active_months: [8, 9, 10],
  },
  {
    common_name: "Common buckthorn",
    scientific_name: "Rhamnus cathartica",
    category: "shrub",
    id_summary: "Shrub/small tree with dark green glossy leaves and black berries. Reference-only row.",
    id_key_tell: "Small thorn-tipped twigs; leaves have 3-4 pairs of curved veins; orange inner bark when cut.",
    removal_summary: "Cut-stump herbicide or basal bark for larger stems; hand-pull small plants.",
    best_timing: "Fall, when it retains leaves after natives have dropped theirs.",
    herbicide_notes: "Read the label before treatment.",
    source_links: ["https://www.kansasforests.org/forestry/invasivewoodyplants.html"],
    active_months: [10, 11],
  },
  {
    common_name: "Japanese barberry",
    scientific_name: "Berberis thunbergii",
    category: "shrub",
    id_summary: "Dense spiny shrub with small oval leaves and red berries. Reference-only row.",
    id_key_tell: "Single spines at leaf nodes; bright red oblong berries persist into winter; yellow inner bark/roots.",
    removal_summary: "Hand-pull or dig small plants (wear gloves — thorny); foliar or cut-stump herbicide for larger stands.",
    best_timing: "Spring or fall.",
    herbicide_notes: "Read the label before treatment.",
    source_links: ["https://www.kansasforests.org/forestry/invasivewoodyplants.html"],
    active_months: [4, 5, 10, 11],
  },
  {
    common_name: "Old World / Caucasian bluestems",
    scientific_name: "Bothriochloa spp.",
    category: "grass",
    id_summary: "Perennial bunchgrass, often planted for forage/erosion control, now invasive in rangeland. Reference-only row.",
    id_key_tell: "Fluffy, white seedheads (bottlebrush-like) in late summer distinguish it from native bluestems.",
    removal_summary: "Prescribed burning combined with targeted herbicide; mowing alone is not effective.",
    best_timing: "Growing season, per local extension recommendations.",
    herbicide_notes: "Read the label before treatment.",
    source_links: ["https://www.agriculture.ks.gov/divisions-programs/plant-protection-weed-control/noxious-weed-control-program/kansas-noxious-weed-list"],
    active_months: [],
  },
  {
    common_name: "Musk thistle",
    scientific_name: "Carduus nutans",
    category: "forb",
    id_summary: "Biennial thistle with large nodding purple flower heads. Kansas noxious weed. Reference-only row.",
    id_key_tell: "Flower heads nod/droop and are large (1.5-3 in) with spiny bracts.",
    removal_summary: "Hand-dig rosettes or cut/herbicide before seed set; Kansas Noxious Weed Law requires control.",
    best_timing: "Spring, before flowering/seed set.",
    herbicide_notes: "Read the label before treatment.",
    source_links: ["https://www.agriculture.ks.gov/divisions-programs/plant-protection-weed-control/noxious-weed-control-program/kansas-noxious-weed-list"],
    active_months: [4, 5],
  },
  {
    common_name: "Leafy spurge",
    scientific_name: "Euphorbia virgata",
    category: "forb",
    id_summary: "Perennial forb with milky sap and yellow-green bracts. Kansas noxious weed. Reference-only row.",
    id_key_tell: "Cutting the stem releases white latex sap; extensive deep root system makes it hard to eradicate.",
    removal_summary: "Persistent, multi-year herbicide program typically required; Kansas Noxious Weed Law requires control.",
    best_timing: "Multiple treatments across the growing season per extension guidance.",
    herbicide_notes: "Read the label before treatment.",
    source_links: ["https://www.agriculture.ks.gov/divisions-programs/plant-protection-weed-control/noxious-weed-control-program/kansas-noxious-weed-list"],
    active_months: [],
  },
  {
    common_name: "Kudzu",
    scientific_name: "Pueraria montana var. lobata",
    category: "vine",
    id_summary: "Aggressive climbing/trailing vine with large trifoliate leaves. Kansas noxious weed. Reference-only row.",
    id_key_tell: "Large 3-lobed leaflets in groups of three; vines can grow up to a foot per day in season.",
    removal_summary: "Repeated cutting/mowing plus herbicide over multiple seasons; Kansas Noxious Weed Law requires control.",
    best_timing: "Growing season, per local extension recommendations.",
    herbicide_notes: "Read the label before treatment.",
    source_links: ["https://www.agriculture.ks.gov/divisions-programs/plant-protection-weed-control/noxious-weed-control-program/kansas-noxious-weed-list"],
    active_months: [],
  },
];

export function seedIfEmpty(): void {
  const { count } = db.prepare("SELECT COUNT(*) as count FROM species").get() as { count: number };
  if (count > 0) return;

  const insert = db.prepare(`
    INSERT INTO species (id, common_name, scientific_name, category, id_summary, id_key_tell, removal_summary, best_timing, herbicide_notes, source_links, active_months)
    VALUES (@id, @common_name, @scientific_name, @category, @id_summary, @id_key_tell, @removal_summary, @best_timing, @herbicide_notes, @source_links, @active_months)
  `);

  const insertMany = db.transaction((rows: SpeciesSeed[]) => {
    for (const row of rows) {
      insert.run({
        id: randomUUID(),
        ...row,
        source_links: JSON.stringify(row.source_links),
        active_months: JSON.stringify(row.active_months),
      });
    }
  });

  insertMany(SPECIES);
}

interface SpeciesPhoto {
  url: string;
  /** What the photo shows, e.g. "Leaves and berries", "Flowers", "Key ID feature". */
  caption: string;
  attribution: string;
  source_url: string;
}

/**
 * Keyed by common_name (must match SPECIES above exactly). Sourced from Wikimedia Commons
 * with verified URLs and required attribution. Each entry's existence, author, and license
 * were confirmed against the Commons API before being added here. Multiple photos per species
 * are preferred so a photo showing the id_key_tell feature is available alongside a general
 * habit/whole-plant shot.
 */
const PHOTOS: Record<string, SpeciesPhoto[]> = {
  "Bush honeysuckle (Amur / Tatarian)": [
    {
      url: "/species-photos/bush-honeysuckle.jpg",
      caption: "Leaves and berries",
      attribution: "Photo: Matthieu Sontag / Wikimedia Commons, CC BY-SA 3.0",
      source_url: "https://commons.wikimedia.org/wiki/File:Lonicera_maackii_fruits.jpg",
    },
    {
      url: "/species-photos/honeysuckle-flowers.jpg",
      caption: "Paired tubular spring flowers",
      attribution: "Photo: Fanghong / Wikimedia Commons, CC BY-SA 2.5",
      source_url: "https://commons.wikimedia.org/wiki/File:LoniceraMaackiiFlowers3.jpg",
    },
    {
      url: "/species-photos/honeysuckle-shrub.jpg",
      caption: "Whole-shrub habit in late autumn",
      attribution: "Photo: Famartin / Wikimedia Commons, CC BY-SA 4.0",
      source_url:
        "https://commons.wikimedia.org/wiki/File:2019-11-26_12_55_41_Amur_Honeysuckle_bushes_in_late_autumn_along_Elderberry_Place_in_the_Franklin_Glen_section_of_Chantilly,_Fairfax_County,_Virginia.jpg",
    },
  ],
  "Sericea lespedeza (Chinese bush clover)": [
    {
      url: "/species-photos/sericea-habit.jpg",
      caption: "Whole-plant stand / infestation habit",
      attribution: "Photo: Chris Evans, University of Illinois, Bugwood.org",
      source_url: "https://www.invasive.org/browse/image/1334071",
    },
    {
      url: "https://commons.wikimedia.org/wiki/Special:FilePath/File:Lespedeza_Sericea_2.jpg",
      caption: "Foliage and habit",
      attribution: "Photo: LionMans Account / Wikimedia Commons, CC BY-SA 3.0",
      source_url: "https://commons.wikimedia.org/wiki/File:Lespedeza_Sericea_2.jpg",
    },
    {
      url: "/species-photos/sericea-foliage.jpg",
      caption: "Foliage close-up",
      attribution: "Photo: LionMans Account / Wikimedia Commons, CC BY-SA 3.0",
      source_url: "https://commons.wikimedia.org/wiki/File:Lespedeza_sericea_up_close.jpg",
    },
  ],
  "Callery / Bradford pear": [
    {
      url: "/species-photos/callery-pear-habit.jpg",
      caption: "Whole-tree habit — flowering roadside stand",
      attribution: "Photo: Britt Slattery, US Fish and Wildlife Service, Bugwood.org",
      source_url: "https://www.invasive.org/browse/image/1237072",
    },
    {
      url: "/species-photos/callery-pear.jpg",
      caption: "Flowers",
      attribution: "Photo: Alpsdake / Wikimedia Commons, CC BY-SA 3.0",
      source_url: "https://commons.wikimedia.org/wiki/File:Pyrus_calleryana_flowers_s5.JPG",
    },
    {
      url: "/species-photos/pear-leaf.jpg",
      caption: "Glossy leaf close-up",
      attribution: "Photo: Salicyna / Wikimedia Commons, CC BY-SA 4.0",
      source_url: "https://commons.wikimedia.org/wiki/File:Pyrus_calleryana_f._lanceolata_2019-04-16_0648.jpg",
    },
    {
      url: "https://commons.wikimedia.org/wiki/Special:FilePath/File:Bradford_Pear_in_Autumn.jpg",
      caption: "Fall foliage color",
      attribution: "Photo: Almapayokels / Wikimedia Commons, CC0",
      source_url: "https://commons.wikimedia.org/wiki/File:Bradford_Pear_in_Autumn.jpg",
    },
  ],
  "Tree-of-heaven": [
    {
      url: "/species-photos/tree-of-heaven-habit.jpg",
      caption: "Whole-plant habit — young trees in a naturalized stand",
      attribution: "Photo: Chris Evans, University of Illinois, Bugwood.org",
      source_url: "https://www.invasive.org/browse/image/1330046",
    },
    {
      url: "/species-photos/tree-of-heaven.jpg",
      caption: "Leaflet-base glands (key ID feature)",
      attribution: "Photo: Katherine Wagner-Reiss / Wikimedia Commons, CC BY-SA 4.0",
      source_url:
        "https://commons.wikimedia.org/wiki/File:Ailanthus_altissima_-close-up_showing_glands_at_leaflet_bases.jpg",
    },
    {
      url: "/species-photos/tree-heaven-bark.jpg",
      caption: "Mature bark",
      attribution: "Photo: Famartin / Wikimedia Commons, CC BY-SA 4.0",
      source_url:
        "https://commons.wikimedia.org/wiki/File:2023-06-19_11_14_20_Bark_on_a_large_Tree-of-Heaven_within_Ann_M._Banchoff_Park_in_the_Mountainview_section_of_Ewing_Township,_Mercer_County,_New_Jersey.jpg",
    },
    {
      url: "https://commons.wikimedia.org/wiki/Special:FilePath/File:Ailanthus_altissima_leaves_P7030014_(50083842081).jpg",
      caption: "Whole compound leaf",
      attribution: "Photo: Teresa Grau Ros / Wikimedia Commons, CC BY-SA 2.0",
      source_url:
        "https://commons.wikimedia.org/wiki/File:Ailanthus_altissima_leaves_P7030014_(50083842081).jpg",
    },
  ],
  "Saltcedar / tamarisk": [
    {
      url: "/species-photos/saltcedar-habit.jpg",
      caption: "Whole-shrub flowering habit",
      attribution: "Photo: Steve Dewey, Utah State University, Bugwood.org",
      source_url: "https://www.invasive.org/browse/image/1624020",
    },
    {
      url: "https://commons.wikimedia.org/wiki/Special:FilePath/File:Tamarix_ramosissima_(Tamaricaceae)_(53139152639).jpg",
      caption: "Foliage and flower spikes",
      attribution: "Photo: Dr. Alexey Yakovlev / Wikimedia Commons, CC BY-SA 2.0",
      source_url:
        "https://commons.wikimedia.org/wiki/File:Tamarix_ramosissima_(Tamaricaceae)_(53139152639).jpg",
    },
    {
      url: "https://commons.wikimedia.org/wiki/Special:FilePath/File:Tamarix_ramosissima_by_Prahlad_balaji_2.jpg",
      caption: "Scale-like foliage close-up (key ID feature)",
      attribution: "Photo: Prahlad balaji / Wikimedia Commons, CC BY-SA 4.0",
      source_url: "https://commons.wikimedia.org/wiki/File:Tamarix_ramosissima_by_Prahlad_balaji_2.jpg",
    },
  ],
  "Russian olive": [
    {
      url: "/species-photos/russian-olive-habit.jpg",
      caption: "Whole-tree habit",
      attribution: "Photo: William M. Ciesla, Forest Health Management International, Bugwood.org",
      source_url: "https://www.invasive.org/browse/image/1428090",
    },
    {
      url: "https://commons.wikimedia.org/wiki/Special:FilePath/File:Elaeagnus_angustifolia_20050815_206.jpg",
      caption: "Leaves",
      attribution: "Photo: Georg Slickers / Wikimedia Commons, CC BY-SA 3.0",
      source_url: "https://commons.wikimedia.org/wiki/File:Elaeagnus_angustifolia_20050815_206.jpg",
    },
    {
      url: "https://commons.wikimedia.org/wiki/Special:FilePath/File:Korina_2018-08-28_Elaeagnus_angustifolia_1.jpg",
      caption: "Thorny twigs (key ID feature)",
      attribution: "Photo: Franziska Hollweg (korina.info) / Wikimedia Commons, CC BY-SA 4.0",
      source_url: "https://commons.wikimedia.org/wiki/File:Korina_2018-08-28_Elaeagnus_angustifolia_1.jpg",
    },
    {
      url: "https://commons.wikimedia.org/wiki/Special:FilePath/File:Elaeagnus_angustifolia_Fruit_1.jpg",
      caption: "Fruit",
      attribution: "Photo: Dinnye / Wikimedia Commons, CC BY-SA 3.0",
      source_url: "https://commons.wikimedia.org/wiki/File:Elaeagnus_angustifolia_Fruit_1.jpg",
    },
  ],
  "Autumn olive": [
    {
      url: "/species-photos/autumn-olive-habit.jpg",
      caption: "Whole-shrub habit",
      attribution: "Photo: Chris Evans, University of Illinois, Bugwood.org",
      source_url: "https://www.invasive.org/browse/image/1268027",
    },
    {
      url: "/species-photos/autumn-olive.jpg",
      caption: "Berries",
      attribution: "Photo: Siddharth Patil / Wikimedia Commons, CC0",
      source_url: "https://commons.wikimedia.org/wiki/File:Elaeagnus_umbellata_berries.JPG",
    },
    {
      url: "/species-photos/autumn-olive-leaf.jpg",
      caption: "Silvery-scaled leaf underside (key ID feature)",
      attribution: "Photo: Mark Fickett / Wikimedia Commons, CC BY 3.0",
      source_url: "https://commons.wikimedia.org/wiki/File:Elaeagnus_umbellata_leaf_upper_surface_detail.jpg",
    },
  ],
  "Common buckthorn": [
    {
      url: "/species-photos/common-buckthorn-habit.jpg",
      caption: "Whole-shrub / small-tree habit",
      attribution: "Photo: Richard Webb, Bugwood.org",
      source_url: "https://www.invasive.org/browse/image/1480381",
    },
    {
      url: "/species-photos/common-buckthorn.jpg",
      caption: "Fruit",
      attribution: "Photo: MurielBendel / Wikimedia Commons, CC BY-SA 4.0",
      source_url: "https://commons.wikimedia.org/wiki/File:Rhamnus_cathartica_fruits.jpg",
    },
    {
      url: "https://commons.wikimedia.org/wiki/Special:FilePath/File:Rhamnus-cathartica-buds-thorn-2010-02-11.jpg",
      caption: "Thorn-tipped twig",
      attribution: "Photo: Sten Porse / Wikimedia Commons, CC BY-SA 3.0",
      source_url: "https://commons.wikimedia.org/wiki/File:Rhamnus-cathartica-buds-thorn-2010-02-11.jpg",
    },
    {
      url: "https://commons.wikimedia.org/wiki/Special:FilePath/File:Rhamnus_cathartica_leaves1.jpg",
      caption: "Leaves and venation",
      attribution: "Photo: MurielBendel / Wikimedia Commons, CC BY-SA 4.0",
      source_url: "https://commons.wikimedia.org/wiki/File:Rhamnus_cathartica_leaves1.jpg",
    },
  ],
  "Japanese barberry": [
    {
      url: "/species-photos/japanese-barberry.jpg",
      caption: "Fruit",
      attribution: "Photo: Alpsdake / Wikimedia Commons, CC BY-SA 4.0",
      source_url: "https://commons.wikimedia.org/wiki/File:Berberis_thunbergii_(fruit).jpg",
    },
    {
      url: "https://commons.wikimedia.org/wiki/Special:FilePath/File:Berberis_thunbergii_habitus.jpg",
      caption: "Whole-shrub habit",
      attribution: "Photo: Gmihail / Wikimedia Commons, CC BY-SA 3.0 RS",
      source_url: "https://commons.wikimedia.org/wiki/File:Berberis_thunbergii_habitus.jpg",
    },
  ],
  "Old World / Caucasian bluestems": [
    {
      url: "https://commons.wikimedia.org/wiki/Special:FilePath/File:Bothriochloa_ischaemum_-_yellow_bluestem_-_Flickr_-_Matt_Lavin_(4).jpg",
      caption: "Seedheads (species shown: Bothriochloa ischaemum)",
      attribution: "Photo: Matt Lavin / Wikimedia Commons, CC BY-SA 2.0",
      source_url:
        "https://commons.wikimedia.org/wiki/File:Bothriochloa_ischaemum_-_yellow_bluestem_-_Flickr_-_Matt_Lavin_(4).jpg",
    },
    {
      url: "https://commons.wikimedia.org/wiki/Special:FilePath/File:Bothriochloa_ischaemum_-_yellow_bluestem_-_Flickr_-_Matt_Lavin_(1).jpg",
      caption: "Whole-plant / grass-stand habit",
      attribution: "Photo: Matt Lavin / Wikimedia Commons, CC BY-SA 2.0",
      source_url:
        "https://commons.wikimedia.org/wiki/File:Bothriochloa_ischaemum_-_yellow_bluestem_-_Flickr_-_Matt_Lavin_(1).jpg",
    },
  ],
  "Musk thistle": [
    {
      url: "/species-photos/musk-thistle-habit.jpg",
      caption: "Whole flowering plant",
      attribution: "Photo: Norman E. Rees, USDA Agricultural Research Service (Retired), Bugwood.org",
      source_url: "https://www.invasive.org/browse/image/0025033",
    },
    {
      url: "https://commons.wikimedia.org/wiki/Special:FilePath/File:Bókoló_bogáncs_(Carduus_nutans)1.JPG",
      caption: "Flower head",
      attribution: "Photo: Zsuzsakossuth / Wikimedia Commons, CC BY-SA 3.0",
      source_url: "https://commons.wikimedia.org/wiki/File:Bókoló_bogáncs_(Carduus_nutans)1.JPG",
    },
    {
      url: "/species-photos/musk-thistle-rosette.jpg",
      caption: "Rosette stage",
      attribution: "Photo: Ryan Hodnett / Wikimedia Commons, CC BY-SA 4.0",
      source_url:
        "https://commons.wikimedia.org/wiki/File:Musk_Thistle_(Carduus_nutans)_-_Saskatoon,_Saskatchewan_2014-09-19.jpg",
    },
  ],
  "Leafy spurge": [
    {
      url: "/species-photos/leafy-spurge-habit.jpg",
      caption: "Field infestation — whole-plant stand",
      attribution: "Photo: USDA Agricultural Research Service, Bugwood.org",
      source_url: "https://www.invasive.org/browse/image/3970065",
    },
    {
      url: "/species-photos/leafy-spurge.jpg",
      caption: "Foliage and bracts (filed as the synonym Euphorbia esula)",
      attribution: "Photo: Kristian Peters (Fabelfroh) / Wikimedia Commons, CC BY-SA 3.0",
      source_url: "https://commons.wikimedia.org/wiki/File:Euphorbia_esula.jpeg",
    },
  ],
  Kudzu: [
    {
      url: "/species-photos/kudzu.jpg",
      caption: "Leaves",
      attribution: "Photo: Miya / Wikimedia Commons, CC BY-SA 3.0",
      source_url: "https://commons.wikimedia.org/wiki/File:Kuzu_leaves01.jpg",
    },
    {
      url: "https://commons.wikimedia.org/wiki/Special:FilePath/File:Kudzu_strangling_grass.jpg",
      caption: "Aggressive climbing habit",
      attribution: "Photo: Jidanni / Wikimedia Commons, CC BY-SA 4.0",
      source_url: "https://commons.wikimedia.org/wiki/File:Kudzu_strangling_grass.jpg",
    },
    {
      url: "https://commons.wikimedia.org/wiki/Special:FilePath/File:Flowering_kudzu.jpg",
      caption: "Flowers",
      attribution: "Photo: Gmaxwell / Wikimedia Commons, Public domain",
      source_url: "https://commons.wikimedia.org/wiki/File:Flowering_kudzu.jpg",
    },
  ],
};

/** Idempotent: safe to run on every boot, including against a DB seeded before photos existed. */
export function backfillPhotos(): void {
  const entries = Object.entries(PHOTOS);
  if (entries.length === 0) return;

  const update = db.prepare(`UPDATE species SET photos = @photos WHERE common_name = @common_name`);

  const updateMany = db.transaction((rows: [string, SpeciesPhoto[]][]) => {
    for (const [common_name, photos] of rows) {
      update.run({ common_name, photos: JSON.stringify(photos) });
    }
  });

  updateMany(entries);
}
