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
    id_summary: "Fast-growing tree with compound leaves and a strong, unpleasant odor when crushed.",
    id_key_tell: "Leaflets have a gland tooth near the base; crushed foliage smells rank (like burnt peanut butter/cashew).",
    removal_summary: "Herbicide required in nearly all cases — cutting alone triggers massive root suckering, with new stems appearing 50-90 ft from the parent tree. Cut-stump, basal bark, foliar spray, and hack-and-squirt/girdle are all documented; see detailed methods below.",
    best_timing: "Summer through early fall, while fully leafed and translocating to roots (before fall color).",
    herbicide_notes: "No Kansas-specific rate data found for this species; the detailed methods below come from a USDA Forest Service field guide and the Missouri Invasive Plant Council.",
    source_links: [
      "https://www.kansasforests.org/forestry/invasivewoodyplants.html",
      "https://www.fs.usda.gov/media/17408",
      "https://moinvasives.org/project/tree-of-heaven-2/",
    ],
    active_months: [7, 8, 9],
  },
  {
    common_name: "Saltcedar / tamarisk",
    scientific_name: "Tamarix ramosissima",
    category: "shrub/tree",
    id_summary: "Riparian shrub/small tree with scale-like leaves and dense pink-white flower spikes.",
    id_key_tell: "Scale-like, juniper-esque foliage on slender branches; found along streams and disturbed riparian areas.",
    removal_summary: "Cutting alone always fails — untreated cut-stumps resprout within 2-4 months, and burning alone actually increases saltcedar's population. K-State's own two-decade southwest Kansas field trials found cut-stump and foliar herbicide most reliable; basal bark markedly less so (72% control). See detailed methods below.",
    best_timing: "August through early October, per K-State's long-running southwest Kansas field trials.",
    herbicide_notes: "Riparian sites may have additional aquatic-label restrictions — read the label. Rates below are Kansas-specific, from K-State field trials on the Cimarron National Grassland and Arkansas/Cimarron river system.",
    source_links: [
      "https://www.agriculture.ks.gov/divisions-programs/plant-protection-weed-control/noxious-weed-control-program/kansas-noxious-weed-list",
      "https://bookstore.ksre.ksu.edu/pubs/2026-chemical-weed-control-for-field-crops-pastures-rangeland-and-noncropland_CHEMWEEDGUIDE.pdf",
      "https://uknowledge.uky.edu/igc/XXV_IGC_2023/Ecology/28",
      "https://bioone.org/journals/transactions-of-the-kansas-academy-of-science/volume-113/issue-3_2f_4/062.113.0310/",
    ],
    active_months: [8, 9, 10],
  },
  {
    common_name: "Russian olive",
    scientific_name: "Elaeagnus angustifolia",
    category: "tree",
    id_summary: "Small tree with silvery-gray leaves and thorny branches.",
    id_key_tell: "Leaves are silvery on both sides; fragrant yellow flowers in spring; thorned twigs.",
    removal_summary: "Hand-grub small trees; mowing saplings without repeating it annually just makes the plant grow back multi-stemmed and brushier. For established trees, cut-stump or basal bark (dormant season) or a Kansas-specific foliar spray (late May-June) all work, but rarely as a single treatment — expect to monitor and retreat resprouts for several years. See detailed methods below.",
    best_timing: "Late May to mid-June for foliar spray (Kansas-specific window); dormant season for cut-stump/basal bark.",
    herbicide_notes: "K-State's own rangeland guide gives a specific foliar rate for this species; a dormant-stem pellet method (Velpar L/Pronone) is also listed but will cause some grass damage since it's soil-active.",
    source_links: [
      "https://www.kansasforests.org/forestry/invasivewoodyplants.html",
      "https://www.fs.usda.gov/sites/nfs/files/legacy-media/r03/Russian%20Olive%20Field%20Guide%202017.pdf",
      "https://bookstore.ksre.ksu.edu/pubs/2026-chemical-weed-control-for-field-crops-pastures-rangeland-and-noncropland_CHEMWEEDGUIDE.pdf",
    ],
    active_months: [5, 6],
  },
  {
    common_name: "Autumn olive",
    scientific_name: "Elaeagnus umbellata",
    category: "shrub",
    id_summary: "Deciduous shrub with silvery-scaled leaf undersides and red speckled berries.",
    id_key_tell: "Leaf undersides are silvery-scaled; fruit is small, red, and speckled in fall.",
    removal_summary: "Cutting alone backfires — it causes prolific resprouting and more stems, not fewer. Basal bark in the dormant season is the most effective single method documented (~95% kill reported); cut-stump and foliar spray are also used, mainly July-September. See detailed methods below.",
    best_timing: "July-September for cut-stump/foliar spray; dormant season for basal bark.",
    herbicide_notes: "No Kansas-specific control research found for this species — rates below are from Missouri Dept. of Conservation and Ohio State Extension.",
    source_links: [
      "https://www.kansasforests.org/forestry/invasivewoodyplants.html",
      "https://mdc.mo.gov/trees-plants/invasive-plants/autumn-olive-control",
      "https://ohioline.osu.edu/factsheet/F-69-11",
    ],
    active_months: [7, 8, 9],
  },
  {
    common_name: "Common buckthorn",
    scientific_name: "Rhamnus cathartica",
    category: "shrub",
    id_summary: "Shrub/small tree with dark green glossy leaves and black berries.",
    id_key_tell: "Small thorn-tipped twigs; leaves have 3-4 pairs of curved veins; orange inner bark when cut.",
    removal_summary: "Cutting or girdling without an herbicide follow-up causes resprouting. Cut-stump or basal bark, done in fall while buckthorn still holds green leaves after natives have dropped theirs, is the most reliable approach; small stems can be hand-pulled. See detailed methods below.",
    best_timing: "Fall, when it retains leaves after natives have dropped theirs.",
    herbicide_notes: "No Kansas-specific control research found for this species — rates below are from Missouri Dept. of Conservation and Minnesota DNR.",
    source_links: [
      "https://www.kansasforests.org/forestry/invasivewoodyplants.html",
      "https://mdc.mo.gov/trees-plants/invasive-plants/common-buckthorn-control",
      "https://www.dnr.state.mn.us/invasives/terrestrialplants/woody/buckthorn/control.html",
    ],
    active_months: [10, 11],
  },
  {
    common_name: "Japanese barberry",
    scientific_name: "Berberis thunbergii",
    category: "shrub",
    id_summary: "Dense spiny shrub with small oval leaves and red berries.",
    id_key_tell: "Single spines at leaf nodes; bright red oblong berries persist into winter; yellow inner bark/roots.",
    removal_summary: "Cutting alone causes resprouting — always pair it with herbicide. Cut-stump is generally more effective than basal bark for this species specifically. Seed and root fragments stay viable up to 9 years, so plan on multi-year monitoring regardless of method. See detailed methods below.",
    best_timing: "Spring (foliar, just before flowering) or fall (cut-stump/basal bark, or late-summer-into-fall foliar).",
    herbicide_notes: "No Kansas-specific control research found for this species — rates below are from Illinois Extension, Minnesota DNR, and Ohio State Extension.",
    source_links: [
      "https://www.kansasforests.org/forestry/invasivewoodyplants.html",
      "https://extension.illinois.edu/invasives/invasive-japanese-barberry",
      "https://www.dnr.state.mn.us/invasives/terrestrialplants/woody/japanesebarberry.html",
      "https://ohioline.osu.edu/factsheet/anr-0106",
    ],
    active_months: [4, 5, 9, 10, 11],
  },
  {
    common_name: "Old World / Caucasian bluestems",
    scientific_name: "Bothriochloa spp.",
    category: "grass",
    id_summary: "Perennial bunchgrass, often planted for forage/erosion control, now invasive in rangeland.",
    id_key_tell: "Fluffy, white seedheads (bottlebrush-like) in late summer distinguish it from native bluestems.",
    removal_summary: "No single treatment is enough — K-State's own Kansas field research found a single late-summer burn fades in effectiveness by year three, and mowing/burning alone is tolerated by this grass better than by native competitors. A multi-year program combining a late-summer burn or spring mow (to strip old thatch) with a two-pass spring herbicide program is what K-State's research actually supports. See detailed methods below.",
    best_timing: "Spring green-up (4-5 leaf stage) for herbicide, ideally preceded by a late-summer prescribed burn.",
    herbicide_notes: "Rates below are Kansas-specific (K-State rangeland guide and field trials). Glyphosate is markedly more damaging to native grasses than imazapyr at the tested rates — weigh that tradeoff if rangeland restoration is the goal. Caucasian bluestem is county-declared noxious in Greenwood County, KS, per K-State's most recent update — not confirmed as a statewide listing.",
    source_links: [
      "https://www.agriculture.ks.gov/divisions-programs/plant-protection-weed-control/noxious-weed-control-program/kansas-noxious-weed-list",
      "https://eupdate.agronomy.ksu.edu/article_new/old-world-bluestem-control-in-kansas-grasslands-522-2",
      "https://newprairiepress.org/kaesrr/vol11/iss1/2/",
      "https://mdc.mo.gov/trees-plants/invasive-plants/old-world-bluestem-control",
    ],
    active_months: [4, 5, 8, 9],
  },
  {
    common_name: "Musk thistle",
    scientific_name: "Carduus nutans",
    category: "forb",
    id_summary: "Biennial thistle with large nodding purple flower heads. Kansas noxious weed.",
    id_key_tell: "Flower heads nod/droop and are large (1.5-3 in) with spiny bracts.",
    removal_summary: "Because it's a biennial, destroying the flower head before seed-set makes this largely a 1-2 season fix rather than a multi-year program (though seedbank monitoring should continue). K-State's own field trials favor fall rosette-stage spraying as the single best window; Kansas Noxious Weed Law requires control. See detailed methods below.",
    best_timing: "Fall, targeting the rosette stage (spring rosette-to-bud stage also works if fall was missed).",
    herbicide_notes: "K-State's own Kansas field trials found fall-applied 2,4-D LVE (2 lb/ac) gave 80% control vs. only 49% for the amine formulation of the same herbicide — formulation choice matters. Full rate table below is drawn directly from K-State's Chemical Weed Control Guide.",
    source_links: [
      "https://www.agriculture.ks.gov/divisions-programs/plant-protection-weed-control/noxious-weed-control-program/kansas-noxious-weed-list",
      "https://bookstore.ksre.ksu.edu/pubs/2026-chemical-weed-control-for-field-crops-pastures-rangeland-and-noncropland_CHEMWEEDGUIDE.pdf",
      "https://eupdate.agronomy.ksu.edu/article/musk-thistle-control-in-the-fall-610-4",
      "https://www.sedgwickcounty.org/media/67291/23-musk-thistle-ps-5574.pdf",
    ],
    active_months: [4, 5, 10, 11],
  },
  {
    common_name: "Leafy spurge",
    scientific_name: "Euphorbia virgata",
    category: "forb",
    id_summary: "Perennial forb with milky sap and yellow-green bracts. Kansas noxious weed.",
    id_key_tell: "Cutting the stem releases white latex sap; extensive deep root system makes it hard to eradicate.",
    removal_summary: "A multi-year (3-5+ year minimum) herbicide program, not a one-time treatment — root fragments as small as 1/2 inch resprout, and mechanical control alone is not practical per Kansas's own guidance. Even 20 years of annual spraying at one well-documented site significantly reduced but did not eradicate the population — set expectations accordingly. Kansas Noxious Weed Law requires control. See detailed methods below.",
    best_timing: "True-flower stage in June (not the earlier yellow-bract stage), with a fall follow-up in September.",
    herbicide_notes: "Kansas Dept. of Agriculture lists eligible active ingredients (2,4-D, dicamba, glyphosate, imazapic, picloram) for cost-share but does not publish rates for this species — rates below are from North Dakota State, Colorado State, and Missouri Dept. of Conservation Extension.",
    source_links: [
      "https://www.agriculture.ks.gov/divisions-programs/plant-protection-weed-control/noxious-weed-control-program/kansas-noxious-weed-list",
      "https://www.sedgwickcounty.org/media/67290/23-leafy-spurge-ps-5580.pdf",
      "https://www.co.ward.nd.us/DocumentCenter/View/1117/w765-Leafy-Spurge-Biology-Ecology-and-Management",
      "https://www.extension.colostate.edu/docs/pubs/natres/03107.pdf",
      "https://mdc.mo.gov/trees-plants/invasive-plants/leafy-spurge-control",
    ],
    active_months: [6, 9],
  },
  {
    common_name: "Kudzu",
    scientific_name: "Pueraria montana var. lobata",
    category: "vine",
    id_summary: "Aggressive climbing/trailing vine with large trifoliate leaves. Kansas noxious weed.",
    id_key_tell: "Large 3-lobed leaflets in groups of three; vines can grow up to a foot per day in season.",
    removal_summary: "A multi-year herbicide program is standard — Missouri's long-term trial found restricted-use Tordon (picloram) products clearly outperformed glyphosate or triclopyr alone. Hand-digging established infestations is, per Kansas's own guidance, \"physically difficult and potentially hazardous.\" Kansas Noxious Weed Law requires control. See detailed methods below.",
    best_timing: "First pass late June-July (active growth); second pass late summer-early fall (regrowth).",
    herbicide_notes: "Kansas Dept. of Agriculture lists eligible active ingredients (aminopyralid, dicamba, glyphosate, tebuthiuron, triclopyr) for cost-share but does not publish rates for this species — rates below are from Missouri Dept. of Conservation, Mississippi State, and Alabama Extension. Tordon (picloram) products are restricted-use and require a certified applicator.",
    source_links: [
      "https://www.agriculture.ks.gov/divisions-programs/plant-protection-weed-control/noxious-weed-control-program/kansas-noxious-weed-list",
      "https://www.sedgwickcounty.org/media/67289/23-kudzu-ps-5579.pdf",
      "https://mdc.mo.gov/trees-plants/invasive-plants/kudzu-control",
      "https://extension.msstate.edu/publications/kudzu",
      "https://www.aces.edu/wp-content/uploads/2024/04/ANR-2168_Kudzu-Control-Residential_040824L-G.pdf",
    ],
    active_months: [6, 7, 9, 10],
  },
];

export function seedIfEmpty(): void {
  const { count } = db.prepare("SELECT COUNT(*) as count FROM species").get() as { count: number };
  if (count > 0) return;

  const insert = db.prepare(`
    INSERT INTO species (id, common_name, scientific_name, category, id_summary, id_key_tell, removal_summary, best_timing, herbicide_notes, source_links, active_months, lookalikes, removal_methods)
    VALUES (@id, @common_name, @scientific_name, @category, @id_summary, @id_key_tell, @removal_summary, @best_timing, @herbicide_notes, @source_links, @active_months, @lookalikes, @removal_methods)
  `);

  const insertMany = db.transaction((rows: SpeciesSeed[]) => {
    for (const row of rows) {
      insert.run({
        id: randomUUID(),
        ...row,
        source_links: JSON.stringify(row.source_links),
        active_months: JSON.stringify(row.active_months),
        lookalikes: JSON.stringify(LOOKALIKES[row.common_name] ?? []),
        removal_methods: JSON.stringify(REMOVAL_METHODS[row.common_name] ?? []),
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

interface SpeciesLookalike {
  /** Common name of the non-invasive/native species it's confused with. */
  name: string;
  scientific_name: string;
  /** How to distinguish it from the invasive species in this record. */
  how_to_tell: string;
  photo: SpeciesPhoto | null;
}

/**
 * Keyed by common_name (must match SPECIES above exactly). Each entry names a real,
 * commonly-documented native/non-invasive species that's easily confused with the invasive
 * in the field, per state DNR / university extension ID guides (see how_to_tell). Not every
 * invasive here has a well-documented native look-alike (e.g. saltcedar's scale-like foliage
 * doesn't closely resemble any common native shrub) — those are simply omitted rather than
 * forcing a weak match.
 */
const LOOKALIKES: Record<string, SpeciesLookalike[]> = {
  "Bush honeysuckle (Amur / Tatarian)": [
    {
      name: "Native viburnums (e.g. nannyberry)",
      scientific_name: "Viburnum lentago and other Viburnum spp.",
      how_to_tell:
        "Both branch oppositely, but viburnum stems have a solid pith while invasive honeysuckle stems are hollow — slice a twig lengthwise to check. Viburnum leaves also have toothed or lobed margins, vs. the smooth-edged leaves of bush honeysuckle.",
      photo: {
        url: "/species-photos/viburnum-nannyberry-lookalike.jpg",
        caption: "Opposite, finely toothed, veined leaves",
        attribution: "Photo: Rob Routledge, Sault College, Bugwood.org",
        source_url: "https://www.invasive.org/browse/image/5445403",
      },
    },
  ],
  "Sericea lespedeza (Chinese bush clover)": [
    {
      name: "Slender lespedeza (native)",
      scientific_name: "Lespedeza virginica",
      how_to_tell:
        "Sericea's leaflets have straight, parallel \"fishbone\" veins running to the leaf edge and cream flowers with a purple patch. The native's veins curve/web near the margin and its flowers are pink, without sericea's dense, hairy, wedge-shaped leaflets.",
      photo: {
        url: "/species-photos/lespedeza-virginica-lookalike.jpg",
        caption: "Pink/lavender flower clusters along the stem",
        attribution: "Photo: Alicia Ballard, iNaturalist, CC BY",
        source_url: "https://www.inaturalist.org/observations/186370436",
      },
    },
  ],
  "Callery / Bradford pear": [
    {
      name: "Serviceberry (native)",
      scientific_name: "Amelanchier arborea and other Amelanchier spp.",
      how_to_tell:
        "Both bloom white in very early spring before leafing out, but serviceberry petals are narrow, strap-shaped, and widely spaced with yellow anthers, while Callery pear petals are rounder and tightly overlapping with purple anthers. Callery pear also has glossy, finely toothed leaves and (on wild trees) thorns; serviceberry has thin, dull-textured leaves and no thorns.",
      photo: {
        url: "/species-photos/serviceberry-lookalike.jpg",
        caption: "Winter twig and buds",
        attribution: "Photo: Bill Cook, Michigan State University, Bugwood.org",
        source_url: "https://www.invasive.org/browse/image/1219068",
      },
    },
  ],
  "Tree-of-heaven": [
    {
      name: "Staghorn sumac (native)",
      scientific_name: "Rhus typhina",
      how_to_tell:
        "Both have long pinnately compound leaves, but tree-of-heaven's leaflets are smooth-edged except for one gland-tipped notch near the base, while sumac's leaflets are toothed along their whole margin and the leaf stem (rachis) is noticeably fuzzy. Crushed tree-of-heaven foliage also smells rank; sumac does not.",
      photo: {
        url: "/species-photos/staghorn-sumac-lookalike.jpg",
        caption: "Compound leaf and mature fuzzy red fruit cluster",
        attribution: "Photo: Franklin Bonner, USFS (ret.), Bugwood.org",
        source_url: "https://www.invasive.org/browse/image/5424069",
      },
    },
  ],
  "Russian olive": [
    {
      name: "Silver buffaloberry (native)",
      scientific_name: "Shepherdia argentea",
      how_to_tell:
        "Both have silvery, scaly foliage, but buffaloberry leaves are arranged in opposite pairs on the stem, while Russian olive has alternate leaves — the single most reliable field check. Buffaloberry branches are also often spine-tipped and the shrub tends to be more upright/thicket-forming.",
      photo: {
        url: "/species-photos/buffaloberry-lookalike.jpg",
        caption: "Branches with silvery, opposite leaves and red berries",
        attribution: "Photo: cwhippo, iNaturalist, CC BY",
        source_url: "https://www.inaturalist.org/observations/17045183",
      },
    },
  ],
  "Autumn olive": [
    {
      name: "Silver buffaloberry (native)",
      scientific_name: "Shepherdia argentea",
      how_to_tell:
        "Both have silvery, scaly foliage, but buffaloberry leaves are arranged in opposite pairs on the stem, while autumn olive has alternate leaves — the single most reliable field check. Buffaloberry branches are also often spine-tipped and the shrub tends to be more upright/thicket-forming.",
      photo: {
        url: "/species-photos/buffaloberry-lookalike.jpg",
        caption: "Branches with silvery, opposite leaves and red berries",
        attribution: "Photo: cwhippo, iNaturalist, CC BY",
        source_url: "https://www.inaturalist.org/observations/17045183",
      },
    },
  ],
  "Common buckthorn": [
    {
      name: "American plum (native)",
      scientific_name: "Prunus americana",
      how_to_tell:
        "Both can look similar at a glance as thicket-forming small trees with dark bark, but buckthorn twigs end in a sharp spine with nearly opposite buds, and scraping the bark reveals bright yellow-orange sapwood underneath. American plum has alternate reddish-brown buds, no terminal spine, greenish-white wood when scraped, and 5-petaled white spring flowers that buckthorn lacks.",
      photo: {
        url: "/species-photos/american-plum-lookalike.jpg",
        caption: "White/pale-pink spring flowers",
        attribution: "Photo: David Stephens, Bugwood.org",
        source_url: "https://www.invasive.org/browse/image/5468686",
      },
    },
  ],
  "Japanese barberry": [
    {
      name: "Allegheny / American barberry (native)",
      scientific_name: "Berberis canadensis",
      how_to_tell:
        "Both are spiny shrubs with small oval leaves and red berries, but Japanese barberry has a single spine at each node, while Allegheny barberry has three-pronged spines and leaves with distinctly toothed (not smooth) margins.",
      photo: {
        url: "/species-photos/allegheny-barberry-lookalike.jpg",
        caption: "Toothed leaf margins and node spine",
        attribution: "Photo: kirk gardner, iNaturalist, CC BY",
        source_url: "https://www.inaturalist.org/observations/167062657",
      },
    },
  ],
  "Old World / Caucasian bluestems": [
    {
      name: "Little bluestem (native)",
      scientific_name: "Schizachyrium scoparium",
      how_to_tell:
        "Old World bluestems form coarser clumps with fluffy, bottlebrush-like whitish seedheads and turn yellow/tan in fall. Little bluestem is more slender and delicate, with a reddish-copper fall color and a seedhead that isn't nearly as showy or fluffy.",
      photo: {
        url: "/species-photos/little-bluestem-lookalike.jpg",
        caption: "Whole-clump habit showing reddish-bronze late-summer color",
        attribution: "Photo: Rob Routledge, Sault College, Bugwood.org",
        source_url: "https://www.invasive.org/browse/image/5498603",
      },
    },
  ],
  "Musk thistle": [
    {
      name: "Swamp thistle (native)",
      scientific_name: "Cirsium muticum",
      how_to_tell:
        "Musk thistle has spiny, sharp bracts beneath a large (1.5-3 in) nodding flower head. Swamp thistle's flower heads lack those sharp spiny bracts (look cobwebby/fuzzy instead), and it grows in wet ground — swamps, stream banks, wet meadows — rather than the dry, disturbed ground musk thistle favors.",
      photo: {
        url: "/species-photos/swamp-thistle-lookalike.jpg",
        caption: "Flower heads with smooth, cobwebby bracts — no spines",
        attribution: "Photo: Rob Routledge, Sault College, Bugwood.org",
        source_url: "https://www.invasive.org/browse/image/5498498",
      },
    },
  ],
  "Leafy spurge": [
    {
      name: "Flowering spurge (native)",
      scientific_name: "Euphorbia corollata",
      how_to_tell:
        "Leafy spurge has yellow-green bracts around its tiny flowers and leaves attached singly (alternate) up the stem. Flowering spurge has true white-petaled flowers and a whorl of several leaves at one point just below the flower clusters — a quick, reliable tell.",
      photo: {
        url: "/species-photos/flowering-spurge-lookalike.jpg",
        caption: "White flowers in a loose cluster",
        attribution: "Photo: Vern Wilkins, Indiana University, Bugwood.org",
        source_url: "https://www.invasive.org/browse/image/5505540",
      },
    },
  ],
  Kudzu: [
    {
      name: "Virginia creeper (native)",
      scientific_name: "Parthenocissus quinquefolia",
      how_to_tell:
        "Kudzu has 3 broad, sometimes-lobed leaflets per leaf and climbs by twining its stems. Virginia creeper has 5 leaflets radiating from one point and climbs using tendrils tipped with adhesive disks, not by twining — no confusion once you count leaflets.",
      photo: {
        url: "/species-photos/virginia-creeper-lookalike.jpg",
        caption: "Palmately compound leaf, clearly 5 leaflets",
        attribution: "Photo: Theodore Webster, USDA Agricultural Research Service, Bugwood.org",
        source_url: "https://www.invasive.org/browse/image/1560187",
      },
    },
  ],
};

interface RemovalMethod {
  /** e.g. "Mechanical / hand-pull", "Cut-stump", "Basal bark", "Foliar spray", "Prescribed fire". */
  method: string;
  timing: string;
  /** Product/active ingredient + rate, or "" for a non-chemical method. */
  herbicide: string;
  how_to: string;
  notes: string;
}

/**
 * Keyed by common_name (must match SPECIES above exactly). Per-method breakdown of removal
 * options — mechanical, cut-stump, basal bark, foliar, etc. Every herbicide product/rate here
 * is drawn from the same extension/state-agriculture sources already listed in that species'
 * source_links; nothing here is estimated or inferred beyond what those sources state.
 */
const REMOVAL_METHODS: Record<string, RemovalMethod[]> = {
  "Bush honeysuckle (Amur / Tatarian)": [
    {
      method: "Mechanical / hand-pull",
      timing: "Any time soil is moist",
      herbicide: "",
      how_to: "Pull small plants by hand while soil is moist — the root system is shallow, so whole plants come out relatively easily.",
      notes: "Only practical for small plants; larger shrubs resprout vigorously if cut without herbicide follow-up.",
    },
    {
      method: "Cut-stump",
      timing: "Any season; fall (Oct-Nov) is easiest for ID and causes the least non-target damage",
      herbicide: "20-25% triclopyr ester in oil (e.g. Garlon 4, Remedy)",
      how_to: "Cut the stem near ground level and apply herbicide to the fresh-cut surface within about 10 minutes of cutting.",
      notes: "Triclopyr is broadleaf-selective and spares grass. Add an herbicide dye so treated stumps are easy to track.",
    },
    {
      method: "Basal bark",
      timing: "Effective in any season",
      herbicide: "Triclopyr ester in basal oil",
      how_to: "Apply to the lower 12-15 inches of bark, full circumference, on stems 2 inches or less in diameter. No cutting required.",
      notes: "Good option for dense stands where cutting every stem isn't practical.",
    },
  ],
  "Sericea lespedeza (Chinese bush clover)": [
    {
      method: "Foliar spray (early summer / vegetative)",
      timing: "June-early July, vegetative stage",
      herbicide: "Remedy Ultra 1-1.5 pt/ac, or PastureGard HL",
      how_to: "Broadcast foliar application across the infested area.",
      notes: "Avoid treating drought-stressed plants — herbicide uptake and efficacy drop.",
    },
    {
      method: "Foliar spray (late summer / blooming)",
      timing: "Aug-Sept, blooming stage, before mid-seed-fill",
      herbicide: "Metsulfuron (Escort XP) ~0.5 oz/ac",
      how_to: "Broadcast foliar application with a non-ionic surfactant added.",
      notes: "Metsulfuron can stunt tall fescue in the treated area. Plan to retreat every 2-4 years — this is a multi-year program, not a one-time treatment.",
    },
    {
      method: "Spot treatment",
      timing: "Growing season",
      herbicide: "1% Remedy Ultra solution",
      how_to: "Spot-spray individual plants or small, scattered patches rather than broadcasting.",
      notes: "Best combined with burning, grazing, or mowing for follow-up control rather than used alone.",
    },
  ],
  "Callery / Bradford pear": [
    {
      method: "Mechanical / hand-pull",
      timing: "Any time, easiest in moist soil",
      herbicide: "",
      how_to: "Pull small saplings by hand — wear gloves, as wild-growing trees are thorny.",
      notes: "Mowing alone is ineffective and can worsen resprouting; this species has zero-tolerance because of how vigorously it resprouts.",
    },
    {
      method: "Cut-stump",
      timing: "Late summer-early fall for herbicide uptake; cut before fruit sets (spring/early summer) if the goal is stopping seed spread this season",
      herbicide: "Triclopyr or glyphosate",
      how_to: "Apply herbicide to the cut stump surface within 15 minutes to 2 hours of cutting.",
      notes: "Cut-stump triclopyr gave ~100% mortality in a multi-state study that included Kansas.",
    },
    {
      method: "Basal bark",
      timing: "Best uptake late winter/early spring or summer",
      herbicide: "25% triclopyr ester + 75% crop oil",
      how_to: "Apply to the lower 12 inches of bark, full circumference, on stems up to 6 inches in diameter. No cutting required.",
      notes: "Good for smaller-diameter trees where you want to avoid cutting.",
    },
  ],
  "Tree-of-heaven": [
    {
      method: "Mechanical / hand-pull",
      timing: "Only for very young seedlings, pulled while soil is moist",
      herbicide: "",
      how_to: "Pull small seedlings by hand, making sure the whole root comes out — fragments left behind will regenerate.",
      notes: "Cutting or mowing a rooted tree does NOT kill it — it triggers massive root suckering, with new stems appearing 50-90 ft from the parent tree. Never cut without an herbicide follow-up.",
    },
    {
      method: "Cut-stump",
      timing: "Mid-to-late summer through early fall, while the tree is fully leafed and translocating to roots",
      herbicide: "Triclopyr ester or imazapyr mixed 1:1 to 1:2 with bark/crop oil",
      how_to: "Apply to the cut surface within 5 minutes of cutting; on larger stumps, cover the cambial ring just inside the bark, not just the flat cut face.",
      notes: "Not very reliable alone for this species — about 60-80% mortality under good conditions. The Missouri Invasive Plant Council recommends basal bark or hack-and-squirt over cut-stump for large infestations.",
    },
    {
      method: "Basal bark",
      timing: "While fully leafed, before fall color begins",
      herbicide: "Triclopyr 20% in 80% crop oil (picloram can be added for improved efficacy, but it's restricted-use)",
      how_to: "Spray a 12-15 in band around the base for trunks up to 6 in diameter (widen to a 24 in band for larger trunks), low pressure, full circumference.",
      notes: "Best on 4-8 in diameter trunks.",
    },
    {
      method: "Foliar spray",
      timing: "Summer to early fall, actively growing, fully leafed, before fall color",
      herbicide: "Triclopyr (Garlon 4/Remedy) 3-6 qt/acre broadcast or 1-2% spot spray",
      how_to: "Broadcast or spot-spray foliage to wet, not to runoff.",
      notes: "Triclopyr is grass-safe but still harms other broadleaf trees/shrubs. Glyphosate (2-5 qt/ac) and imazapyr (1-1.5 pt/ac) are nonselective alternatives listed in the same USDA field guide.",
    },
    {
      method: "Hack-and-squirt / girdle",
      timing: "June-early July, fully leafed and actively growing — for large trunks (over 8 in)",
      herbicide: "Triclopyr or glyphosate amine, or a 2-5% solution of glyphosate/imazapyr/triclopyr",
      how_to: "Make one hack (a cut into the cambium) per inch of stem diameter around the trunk, and squirt herbicide into each cut within 5 minutes. Leave the tree standing.",
      notes: "Avoids felling a large tree while still killing it. Expect to monitor for root suckers for several years regardless of method.",
    },
  ],
  "Saltcedar / tamarisk": [
    {
      method: "Mechanical",
      timing: "Not a standalone method",
      herbicide: "",
      how_to: "Cutting must always be paired with a stump herbicide treatment applied the same day — never cut without treating.",
      notes: "K-State field trials found all untreated cut-stumps resprouted within 2-4 months. Burning alone actually increases saltcedar's population, per K-State's own rangeland weed guide.",
    },
    {
      method: "Cut-stump",
      timing: "Dormant-season cutting",
      herbicide: "Imazapyr (Arsenal) 10% v/v in water, or PastureGard HL undiluted (a saltcedar-specific exception to the usual 25%-in-diesel rate used for other woody species)",
      how_to: "Apply to the cambium of the freshly cut stump immediately after cutting.",
      notes: "K-State's own southwest Kansas field trials (Cimarron National Grassland area) found ≥80% mortality at 15 months from imazapyr alone (10%), triclopyr (5-10%), or glyphosate+imazapyr combinations; glyphosate alone below 180 g/L was ineffective.",
    },
    {
      method: "Basal bark",
      timing: "August through early October",
      herbicide: "Triclopyr 10% v/v in diesel",
      how_to: "Spray the full circumference of the lower stem.",
      notes: "K-State's own 15-year southwest Kansas field trial (2007-2021) averaged only 72% control with this method — notably less reliable than cut-stump or foliar in the same long-running trial.",
    },
    {
      method: "Foliar spray",
      timing: "August through early October",
      herbicide: "Imazapyr (Arsenal) 2 qt/acre + 1 qt/acre MSO, or 0.5% imazapyr + 0.5% glyphosate + 1% MSO",
      how_to: "Spray to wet, not to runoff.",
      notes: "K-State's own multi-year Kansas trials found the imazapyr+glyphosate combination the best performer (92% control, 2017-2021 data); an aminopyralid+triclopyr mix was the weakest option tested (42%).",
    },
  ],
  "Russian olive": [
    {
      method: "Mechanical / hand-pull",
      timing: "Any time; most effective right after rain, while soil is moist",
      herbicide: "",
      how_to: "Hand-grub small trees under 3.5 in diameter with a shovel, hoe, or weed wrench; hand-pull seedlings and sprouts.",
      notes: "Mowing saplings 1 in or less in diameter won't kill the plant, and if not repeated annually before stems get thicker, it grows back multi-stemmed and brushier. Large-scale mechanical clearing still needs an herbicide follow-up, since lateral roots resprout.",
    },
    {
      method: "Cut-stump",
      timing: "Late fall/winter, for larger trunks",
      herbicide: "Triclopyr ester 50% solution (stems under 8 in), or 75-100% solution (stems over 8 in); or imazapyr 10% with 90% methylated seed oil",
      how_to: "Apply to the fresh-cut surface within 5-15 minutes of cutting; on stems over 4 in, treat the cambial layer just inside the bark ring.",
      notes: "No Kansas-specific cut-stump rate was found for this species — this is from a dedicated USDA Forest Service Russian olive field guide.",
    },
    {
      method: "Basal bark",
      timing: "Any time of year, though often done in winter (less non-target injury to dormant surrounding plants)",
      herbicide: "Triclopyr (Garlon 4) 25-50% in carrier oil",
      how_to: "Spray the full circumference from ground level to 12-15 in up the stem, until wet but not to runoff. Best on stems 5 in or less in diameter.",
      notes: "Garlon 4 volatilizes above 86°F — avoid hot-weather application. Kansas's own rangeland guide instead lists a dormant-stem pellet method (Velpar L or Pronone Power Pellet, applied April-June by exact-delivery applicator) that will cause some grass damage since it's soil-active.",
    },
    {
      method: "Foliar spray",
      timing: "Late May to mid-June (Kansas-specific window)",
      herbicide: "1 qt 2,4-D amine + 0.5 pt dicamba (Clarity/Banvel) per acre",
      how_to: "Wet leaves for complete coverage; individual-plant treatment uses about 25 gal of solution.",
      notes: "This exact rate is from K-State's own rangeland weed guide. A broader USDA field guide also lists glyphosate (spring), imazapyr (Aug-Sept), and triclopyr+2,4-D (late spring-early summer — wait 3 weeks before reseeding) as alternatives.",
    },
  ],
  "Autumn olive": [
    {
      method: "Mechanical / hand-pull",
      timing: "Early spring, after rain when soil is moist",
      herbicide: "",
      how_to: "Pull or dig small seedlings, removing the full root.",
      notes: "Simply cutting the shrub off at the base causes prolific sprouting and increases the number of stems — don't cut without treating.",
    },
    {
      method: "Cut-stump",
      timing: "Late in the growing season (July-Sept) or during the dormant season",
      herbicide: "Glyphosate 10-20% solution",
      how_to: "Apply directly to the cut stump within a few minutes of cutting, using a low-pressure hand sprayer or sponge applicator.",
      notes: "Missouri Dept. of Conservation reports this kills the root system and prevents resprouting. Alternative products (triclopyr, imazapyr, picloram+2,4-D) at various oil-carried rates are listed in Ohio State's fact sheet.",
    },
    {
      method: "Basal bark",
      timing: "Dormant season, when the ground is dry and not frozen",
      herbicide: "Undiluted Garlon 4 (triclopyr), or 50:50 with diesel fuel",
      how_to: "Apply a thin pencil-point line around the base, 6-12 in above ground, full circumference.",
      notes: "Missouri Dept. of Conservation reports about 95% kill with this method — the most effective single method documented for this species.",
    },
    {
      method: "Foliar spray",
      timing: "Growing season (April-Sept); summer (July-Aug) is especially effective",
      herbicide: "Dicamba (Banvel) 1 oz per gallon of water + 0.5 oz surfactant, or 2,4-D+triclopyr (Crossbow) per label",
      how_to: "Spray for 100% foliage coverage.",
      notes: "No Kansas-specific rate was found for this species — these numbers are from Missouri Dept. of Conservation and Ohio State Extension. Monitor treated shrubs for 2 years to confirm complete control.",
    },
  ],
  "Common buckthorn": [
    {
      method: "Mechanical / hand-pull / dig",
      timing: "Practical only for small stems, under about 3/8 in diameter",
      herbicide: "",
      how_to: "Hand-pull small seedlings; larger stems need a weed-wrench-style root-pulling tool.",
      notes: "Excavating roots can disturb the soil and open it up for new seedling colonization nearby.",
    },
    {
      method: "Cut-stump",
      timing: "Autumn is preferred — buckthorn holds green leaves after natives drop theirs, and natives are dormant",
      herbicide: "Garlon 3A (triclopyr) 50% solution in water, or glyphosate 50-100%",
      how_to: "Apply to the cut surface within minutes (up to 2 hours) of cutting. Below freezing, switch to an oil-based product and treat the cut surface plus the remaining bark down to the ground line.",
      notes: "Girdling or cutting without treating the stump causes resprouting that will need re-treatment.",
    },
    {
      method: "Basal bark",
      timing: "Late summer through fall",
      herbicide: "Garlon 4 (triclopyr), 2-2.5 oz per gallon of diesel",
      how_to: "Spray 12-15 in up from the ground, full circumference, on stems/resprouts under 6 in diameter (works best under 2-3 in).",
      notes: "",
    },
    {
      method: "Foliar spray",
      timing: "October, after native foliage has gone dormant",
      herbicide: "Triclopyr (water-based, grass-safe), or 2% glyphosate + surfactant",
      how_to: "Spray foliage to wet.",
      notes: "A fall trial found 2% glyphosate + surfactant gave 100% kill on waist-high and smaller seedlings. A Minnesota DNR practitioner survey rated herbicide-based methods far more effective (72% rated extremely/very effective) than manual pulling (50%) or mechanical-only removal (23%).",
    },
  ],
  "Japanese barberry": [
    {
      method: "Mechanical / hand-pull / dig",
      timing: "Easiest in early spring",
      herbicide: "",
      how_to: "Hand-pull small-to-medium plants (careful of the thorns); dig or grub out larger plants.",
      notes: "Repeated cutting weakens plants and reduces seed production but won't eradicate them on its own — cutting alone causes resprouting. A propane torch held to the base for 15-20 seconds is also used on individual plants.",
    },
    {
      method: "Cut-stump",
      timing: "Any season; treat immediately after cutting",
      herbicide: "Glyphosate 25-50% v/v in water, or triclopyr amine 20-25% v/v in water (or ester in oil)",
      how_to: "Apply within 10 minutes (up to 2 hours) of cutting.",
      notes: "",
    },
    {
      method: "Basal bark",
      timing: "Any season",
      herbicide: "Triclopyr ester 20-30% v/v in basal oil",
      how_to: "Spray the lowest 15 in of the stem.",
      notes: "Extension sources note this method is less effective for barberry specifically than cut-stump.",
    },
    {
      method: "Foliar spray",
      timing: "Just before flowering (spring), or late summer into early fall",
      herbicide: "Glyphosate 1-2% v/v, or triclopyr amine 1-2% v/v",
      how_to: "Spray to wet with a surfactant added.",
      notes: "Non-selective — will harm nearby grass and other plants. Seed and root fragments stay viable up to 9 years, so plan on multi-year monitoring regardless of method.",
    },
  ],
  "Old World / Caucasian bluestems": [
    {
      method: "Mechanical / mowing",
      timing: "Not effective alone",
      herbicide: "",
      how_to: "Use mowing, or a late-summer burn, only as a prep step before herbicide — to strip old thatch and force fresh regrowth that takes up herbicide better.",
      notes: "This grass tolerates mowing and burning better than the native grasses it displaces.",
    },
    {
      method: "Foliar spray (spring)",
      timing: "4-5 leaf stage (spring green-up), with a follow-up about 8 weeks later or at early heading",
      herbicide: "Glyphosate 1-2 lb/acre, or imazapyr (Arsenal) 0.25-0.5 lb/acre",
      how_to: "Broadcast application; repeat the same rate on the follow-up pass.",
      notes: "K-State trials found glyphosate at these rates nearly eliminates native warm-season grasses too. Imazapyr is somewhat better tolerated by natives but needs more repeat applications for full control.",
    },
    {
      method: "Spot treatment",
      timing: "Growing season",
      herbicide: "Glyphosate 1-1.5% solution, or imazapyr 0.25% solution",
      how_to: "Spot-spray individual clumps or small patches.",
      notes: "",
    },
    {
      method: "Prescribed fire",
      timing: "Late summer (Aug-Sept)",
      herbicide: "",
      how_to: "Burn during the late-summer window rather than the more common spring burn.",
      notes: "K-State's Smoky Hills field study found a single late-summer burn reduced basal cover 38% after one year, but the effect faded by year three — repeated burns (2 or more) gave a stronger, longer-lasting reduction. Best combined with herbicide applied to the fresh post-burn regrowth.",
    },
  ],
  "Musk thistle": [
    {
      method: "Mechanical",
      timing: "Any time the rosette can be targeted; before bolting/flowering is essential",
      herbicide: "",
      how_to: "Dig, hoe, disk, or till out the root crown.",
      notes: "Mowing or burning only works if done before flowering — cutting a bolted stem too high still leaves an intact root crown that can resprout a new flowering stem.",
    },
    {
      method: "Cultural (grazing)",
      timing: "Rosette through bolting stage, repeated annually",
      herbicide: "",
      how_to: "Graze with sheep, goats, or cattle.",
      notes: "Depletes the seedbank over time when repeated yearly.",
    },
    {
      method: "Foliar spray (fall, rosette stage)",
      timing: "Fall, targeting the rosette stage — K-State's own preferred window",
      herbicide: "2,4-D LVE 2 lb/acre, or Tordon 22K (picloram, restricted-use) 0.5 pt/acre, or Milestone (aminopyralid) 3-5 fl oz/acre, or Chaparral (aminopyralid+metsulfuron) 1.5 oz/acre",
      how_to: "Broadcast spray on rosettes.",
      notes: "K-State field trials found dicamba+2,4-D amine (0.25+0.75 lb/ac) and picloram (0.125 lb/ac) gave over 90% control. Picloram- and aminopyralid-based products also carry over to control seedlings that germinate the following spring. Fall is favored partly because trees/crops are dormant or harvested, reducing spray-drift risk.",
    },
    {
      method: "Foliar spray (spring, rosette-to-prebloom)",
      timing: "Spring, rosette to early-bud stage",
      herbicide: "2,4-D amine 1.5-2 lb ae/acre, or dicamba 0.67 pt/acre, or Escort XP (metsulfuron) 0.25-0.5 oz/acre, or GrazonNext HL 1.2-1.5 pt/acre",
      how_to: "Broadcast spray; several of these products can be applied up to the bud or early-flowering stage.",
      notes: "K-State's Chemical Weed Control Guide has a full rate table with many broadleaf-selective options. Avoid spraying drought-stressed plants.",
    },
  ],
  "Leafy spurge": [
    {
      method: "Mechanical",
      timing: "Not practical as a standalone method",
      herbicide: "",
      how_to: "The only mechanical option is intensive cultivation — 4 in deep tillage every 3 weeks, spring through fall freeze, for 2+ consecutive growing seasons without interruption.",
      notes: "Kansas's own guidance calls this impractical for most sites (erosion, lost land use). Root fragments as small as 1/2 in long and 1/10 in diameter can resprout — interrupting the tillage schedule lets the plant recover quickly.",
    },
    {
      method: "Cultural (grazing)",
      timing: "Vegetative through flowering stage, repeated annually",
      herbicide: "",
      how_to: "Graze with sheep or goats — cattle generally won't eat it.",
      notes: "",
    },
    {
      method: "Foliar spray (primary treatment)",
      timing: "True-flower stage in June — not the earlier yellow-bract stage, which is often mistaken for flowering",
      herbicide: "Picloram (Tordon) 1-2 pt/acre + 2,4-D 1 qt/acre, or dicamba 2 qt/acre alone",
      how_to: "Broadcast spray during active growth.",
      notes: "Kansas's own guide lists these active ingredients as cost-share eligible but doesn't publish rates — these specific rates are from North Dakota State and Colorado State Extension. NDSU found dicamba alone at 2 qt/ac gave 95% control after 3 annual applications; a higher picloram rate (2 qt/ac) declined faster over time than the 1 qt/ac rate.",
    },
    {
      method: "Foliar spray (fall follow-up)",
      timing: "September, after regrowth begins but before a killing frost",
      herbicide: "Glyphosate 33% solution (1 part to 3 parts water), or Plateau (imazapic) 8-12 oz/acre applied mid-September",
      how_to: "Spray regrowth; if using glyphosate, plan a follow-up 2,4-D treatment the next June-July for germinating seedlings.",
      notes: "Fall application lets the herbicide translocate down with nutrients into the root system as the plant prepares for winter — the same logic behind kudzu's and buckthorn's fall/dormant-season windows.",
    },
    {
      method: "Multi-year program",
      timing: "3-5+ years minimum, with ongoing monitoring after that",
      herbicide: "",
      how_to: "Repeat foliar treatment annually — a single season will not eradicate an established patch.",
      notes: "Even 20 years of annual spraying at one well-documented site significantly reduced but did not eradicate the population there. Set expectations accordingly.",
    },
  ],
  Kudzu: [
    {
      method: "Mechanical",
      timing: "Not effective alone for established infestations",
      herbicide: "",
      how_to: "Dig out the root crown and all vines in contact with soil, or mow/cut every week through the hottest part of summer for several consecutive years.",
      notes: "Kansas's own guidance calls hand-digging established infestations \"physically difficult and potentially hazardous.\" Young colonies (3-4 years old) can sometimes be eradicated this way; older ones generally can't be by mechanical means alone.",
    },
    {
      method: "Cut-stump / cut-vine",
      timing: "Late summer or fall; also used as spot cleanup after mowing/herbicide when new sprouts appear",
      herbicide: "Cut-stump products such as triclopyr amine 8-9%, or glyphosate 18-50%, applied undiluted to 50%",
      how_to: "Cut the vine just above the ground and immediately treat the cut stem. This is the safest approach when kudzu has climbed into large trees, since spraying only the lower leaves won't kill a vine that's climbed out of reach.",
      notes: "Root crowns are hard to find after leaves fully emerge, so do this before leaf-out or right after mowing/herbicide knocks growth back.",
    },
    {
      method: "Foliar spray (initial treatment)",
      timing: "No earlier than late June or July, once all stems are actively growing",
      herbicide: "Tordon 101 (2,4-D+picloram) 1 gal/acre for younger patches, 2 gal/acre for patches over 10 years old; or Tordon K (picloram) 0.5-1 gal/acre",
      how_to: "Cross-hatch spray pattern for thorough coverage, 40-80 gal spray mix per acre. Both Tordon products are restricted-use.",
      notes: "Missouri's long-term (8-year) trial found Tordon-based treatments clearly outperformed glyphosate (64% control), Garlon 4 (66%), Garlon 3A (65%), and 2,4-D alone (36%) over 2 years of repeated spraying. Picloram should not be used near streams, ponds, or other sensitive areas, and is particularly damaging to legumes.",
    },
    {
      method: "Foliar spray (follow-up)",
      timing: "Late summer or early fall, on regrowth after the first pass",
      herbicide: "Same product as the initial treatment, at half the initial rate, starting in year 3",
      how_to: "Re-treat regrowth. Skip a year between the initial treatment and the first re-treatment — large roots often don't resprout for 2 years.",
      notes: "This two-pass, multi-year rhythm (active growth in early-mid summer, then regrowth in late summer/fall) mirrors leafy spurge's fall-translocation logic.",
    },
    {
      method: "Spot treatment",
      timing: "Growing season",
      herbicide: "1 pt Tordon 101 (or 0.5 pt Tordon K, or 1 pt Veteran 720) per 4-5 gal water",
      how_to: "Backpack-spray vines immediately around root crowns to medium wetness.",
      notes: "Reported about 99% effective when applied this way directly at root crowns.",
    },
  ],
};

/** Idempotent: safe to run on every boot, including against a DB seeded before removal_methods existed. */
export function backfillRemovalMethods(): void {
  const entries = Object.entries(REMOVAL_METHODS);
  if (entries.length === 0) return;

  const update = db.prepare(`UPDATE species SET removal_methods = @removal_methods WHERE common_name = @common_name`);

  const updateMany = db.transaction((rows: [string, RemovalMethod[]][]) => {
    for (const [common_name, removal_methods] of rows) {
      update.run({ common_name, removal_methods: JSON.stringify(removal_methods) });
    }
  });

  updateMany(entries);
}

/** Idempotent: safe to run on every boot, including against a DB seeded before lookalikes existed. */
export function backfillLookalikes(): void {
  const entries = Object.entries(LOOKALIKES);
  if (entries.length === 0) return;

  const update = db.prepare(`UPDATE species SET lookalikes = @lookalikes WHERE common_name = @common_name`);

  const updateMany = db.transaction((rows: [string, SpeciesLookalike[]][]) => {
    for (const [common_name, lookalikes] of rows) {
      update.run({ common_name, lookalikes: JSON.stringify(lookalikes) });
    }
  });

  updateMany(entries);
}
