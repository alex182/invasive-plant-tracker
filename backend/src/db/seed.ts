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
      "Multi-stemmed shrub with arching stems 6-20 ft tall; opposite, smooth-edged leaves 2-3 in long; fragrant 4-petaled flowers (white, aging to yellow or pink) in pairs from the leaf axils each spring; shiny round orange, red, or pink berries in groups of four starting midsummer; grayish-brown bark that looks vertically shredded.",
    id_key_tell:
      "Stems have a hollow center (pith) at any size — slice one lengthwise to check — and the shrub leafs out earlier and holds its leaves later into fall than native shrubs.",
    removal_summary:
      "Shallow-rooted, so small plants pull easily by hand. Larger stems can be cut with loppers, saws, or brush-hogged, but cutting/mowing alone triggers vigorous resprouting and must be followed by a stump or foliar herbicide treatment. Basal bark works on stems up to 2 in diameter; larger stems should be cut and stump- or foliar-treated instead.",
    best_timing:
      "Full leaf expansion through onset of fall color (roughly June-October) for foliar spray; basal bark and cut-stump treatments can be made year-round.",
    herbicide_notes:
      "Glyphosate alone is effective where honeysuckle is the only target; add water-based triclopyr for a broader spectrum against other invasives present. Triclopyr alone is NOT effective as a foliar spray on this species.",
    source_links: [
      "https://extension.psu.edu/shrub-honeysuckles",
      "https://extension.psu.edu/shrub-honeysuckle-accurate-identification",
    ],
    active_months: [6, 7, 8, 9, 10],
  },
  {
    common_name: "Sericea lespedeza (Chinese bush clover)",
    scientific_name: "Lespedeza cuneata",
    category: "forb",
    id_summary:
      "Upright, semi-woody perennial forb 3-6 ft tall with one to many slender, often gray-green stems bearing lines of hairs; leaves are thin, alternate, abundant, and three-parted (trifoliate), with wedge-shaped, hairy leaflets 0.5-1 in long; small creamy-white flowers with purple throats bloom in clusters of two to four from July to September; fruit is a flat, round, single-seeded pod 0.12-0.15 in wide.",
    id_key_tell:
      "Trifoliate leaflets with a wedge-shaped base, hairy on both sides, and a woody perennial taproot (unlike native annual lespedezas).",
    removal_summary:
      "The seed bank stays viable for decades, so once established this is a long-term control program. Hand-pulling works only on seedlings and young plants with a shallow enough root to fully remove. Mowing at the flower-bud stage, repeated whenever regrowth reaches 12-18 in, can suppress established stands over 2-3 years. Goats browsing under heavy stocking for 3+ years can eliminate adult plants and severely suppress seed production; cattle only forage on early growth. Herbicide timed to the flower-bud stage is the most reliable single treatment — one Missouri CRP case study using metsulfuron in September reported 95-98% control that held the following year with no resprouts.",
    best_timing:
      "Applications during the flower-bud stage are most effective for most herbicides; metsulfuron can also be applied from blooming until a killing frost.",
    herbicide_notes:
      "Metsulfuron (Escort XP) is the best-documented option — a real-world Missouri CRP case study reported 95-98% control in the year of application with no resprouts the year after, even on a previously heavy infestation. Triclopyr, triclopyr+fluroxypyr (PastureGard HL), fluroxypyr, and glyphosate are also used; picloram is a restricted-use alternative.",
    source_links: [
      "https://www.invasiveplantatlas.org/subject.cfm?sub=3033",
      "https://mipncontroldatabase.wisc.edu/search?name=sericea%20lespedeza",
    ],
    active_months: [7, 8, 9],
  },
  {
    common_name: "Callery / Bradford pear",
    scientific_name: "Pyrus calleryana",
    category: "tree",
    id_summary:
      "Small tree rarely more than 40 ft tall, trunk under 1 ft in diameter; alternate, rounded to teardrop-shaped, thick waxy leaves 1.5-3 in long with a finely toothed, rippled margin; white 5-petaled flowers in ball-shaped bundles in early spring, before leaf-out; tiny, hard, green-to-brown pears about 1/2 in across; gray-brown bark that becomes scaly and fissured with age, often with stout spines on naturalized trees.",
    id_key_tell:
      "Flowers smell strongly rancid, not sweet, and open in a tight ball-shaped bundle; leaves have a distinctive wavy, rippled margin.",
    removal_summary:
      "Zero tolerance — small plants can be hand-pulled (removing all roots), but cutting or mowing alone triggers vigorous resprouting and must be paired with herbicide. Cut-stump, basal bark (stems under 6 in), and hack-and-squirt (stems over 6 in) are all effective; foliar spray works on low trees under 10 ft tall.",
    best_timing:
      "Mid-May to onset of fall color for foliar spray; basal bark, cut-stump, and hack-and-squirt can be applied year-round, weather permitting.",
    herbicide_notes:
      "A glyphosate plus water-based triclopyr foliar mix also controls other invasive shrubs (autumn olive, bush honeysuckle, multiflora rose) encountered in the same operation. Cut-stump/hack-and-squirt use oil-based triclopyr ester (anytime after cutting) or water-based glyphosate/triclopyr (immediately after cutting).",
    source_links: [
      "https://extension.psu.edu/callery-pear",
      "https://extension.psu.edu/callery-pear-accurate-identification",
    ],
    active_months: [5, 6, 7, 8, 9, 10],
  },
  {
    common_name: "Tree-of-heaven",
    scientific_name: "Ailanthus altissima",
    category: "tree",
    id_summary:
      "Fast-growing deciduous tree to 80 ft tall and 6 ft in diameter; large pinnately compound leaves 1-4 ft long with 10-40 smooth-edged (entire) leaflets, each with 1-2 gland teeth near the base; smooth brownish-green bark maturing to light gray, resembling cantaloupe skin; stout twigs with a large V- or heart-shaped leaf scar and a spongy brown pith; female trees bear dense clusters of twisted, winged samaras that often persist through winter.",
    id_key_tell:
      "Crushed leaves, twigs, and bark give off a strong, offensive odor; leaflet edges are smooth except for the gland teeth near the base, unlike the toothed leaflets of native look-alikes.",
    removal_summary:
      "Cutting or mowing alone does NOT kill this tree — it triggers massive root suckering, with new stems appearing up to 50 ft from the parent. Root suckers are also nearly impossible to hand-pull (unlike young seedlings, which can be pulled when soil is moist). Effective control requires a systemic herbicide — foliar spray, basal bark, or hack-and-squirt — timed to move the chemical into the roots; cut-stump treatment is not recommended since it does not control roots.",
    best_timing:
      "July 1 to onset of fall color, when the tree is moving carbohydrates down to the roots. Treatment outside this window only injures top growth.",
    herbicide_notes:
      "Glyphosate and triclopyr have practically no soil activity and pose little risk to nontarget plants through root uptake, making them the preferred active ingredients. Dicamba, imazapyr, and metsulfuron methyl are also effective but carry more soil-activity risk.",
    source_links: [
      "https://extension.psu.edu/tree-of-heaven",
      "https://extension.psu.edu/tree-of-heaven-control-strategies",
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
    id_summary:
      "Multi-stemmed shrub or small tree over 20 ft tall with a loose, irregular, willow-like form; thorny stems and branches covered in silvery scales that turn brown with age; narrow, silvery, willow-like leaves and twigs that tend to droop; fragrant yellow tubular flowers in spring to early summer; silvery green-to-yellow fruits ripening red in fall, each with a single seed.",
    id_key_tell:
      "Russian olive can look shrubby when young but grows into a true tree form, with narrower, more willow-like drooping leaves than autumn olive — and in Pennsylvania it's the much less common of the two Elaeagnus species (far more common out west).",
    removal_summary:
      "Once established, difficult to eradicate. Hand-pull or dig young plants and small infestations after rain, when the ground is soft and moist, removing the complete root system to prevent resprouting. Cutting alone is ineffective and can trigger even denser resprouting — combine cutting with an immediate systemic herbicide application to the stump.",
    best_timing: "July through September for cut-stump herbicide, or during winter dormancy.",
    herbicide_notes:
      "Penn State Extension's combined fact sheet for both olive species does not publish specific products or rates for Russian olive alone — always follow the herbicide label.",
    source_links: [
      "https://extension.psu.edu/invasive-autumn-and-russian-olives",
      "https://extension.psu.edu/autumn-olive",
    ],
    active_months: [7, 8, 9],
  },
  {
    common_name: "Autumn olive",
    scientific_name: "Elaeagnus umbellata",
    category: "shrub",
    id_summary:
      "Rapidly growing, often multi-stemmed shrub up to 20 ft tall and 30 ft wide; alternate, simple leaves 2-4 in long with smooth margins, pale green above and silvery/white beneath from tiny scales; trumpet-shaped white-to-pale-yellow 4-petaled flowers (1/2-3/4 in) in clusters of four to six in spring; clusters of bright red (occasionally orange/yellow) fruit flecked with silvery scales in late summer; ashy brown stems with prominent silvery scales when young and sharp, stout spines.",
    id_key_tell:
      "Leaf undersides are silvery/white with fine scales — the single most reliable field check — combined with sharp spines on the stems.",
    removal_summary:
      "Difficult to eradicate once established. Small plants can be pulled or dug by hand; larger plants and infestations are best cut (bush hogs for smaller stems, drum-type forestry cutters for larger ones) followed immediately by a stump or foliar herbicide treatment, since cutting alone is not a standalone fix. Basal bark works year-round on intact stems.",
    best_timing:
      "June to onset of fall color for foliar spray; basal bark and cut-stump treatments can be made year-round.",
    herbicide_notes:
      "Triclopyr alone is effective on autumn olive; glyphosate alone is NOT effective as a foliar spray on this species (unlike on many other targets) — combine glyphosate with triclopyr when treating multiple invasive species at once. 2,4-D (with triclopyr), imazapyr, and dicamba are also documented as effective.",
    source_links: [
      "https://extension.psu.edu/autumn-olive",
      "https://extension.psu.edu/autumn-olive-accurate-identification",
    ],
    active_months: [6, 7, 8, 9],
  },
  {
    common_name: "Common buckthorn",
    scientific_name: "Rhamnus cathartica",
    category: "shrub",
    id_summary:
      "Deciduous shrub or small tree up to 25 ft tall; dark gray bark with bright orange inner bark exposed when cut; twigs usually tipped with a sharp spine; leaves are dark green, oval, 1.5-3 in long, sub-oppositely arranged (though alternate/opposite examples occur), slightly serrate with 3-4 pairs of curving veins; fragrant yellow-green 4-petaled flowers form in clusters of two to six in spring (male and female flowers occur on separate plants); small purple-to-black fruit, about 1/4 in across, appears in fall.",
    id_key_tell:
      "Twigs usually end in a sharp spine, and scraping the bark reveals bright orange inner wood — the fastest field check.",
    removal_summary:
      "Difficult to remove and can regenerate after cutting or burning, so plan on a multi-step, often multi-year approach. Plants under 0.4 in diameter pull easily from moist soil; 0.5-1.5 in stems can be dug, removing the root crown to prevent resprouting. Mowing and burning alone rarely kill established plants and mainly reduce vigor unless paired with herbicide. A documented case study found repeated goat grazing (2-3 times in the first year) will eventually exhaust the plant's food reserves and kill it, averaging about 300 sq ft cleared per goat on the first grazing. For herbicide, cut-stump treatment is well-documented down to very small stems.",
    best_timing:
      "Foliar herbicide when the plant is actively growing and fully leafed out; cut-stump, hack-and-squirt, and basal bark treatments can be applied any time of year.",
    herbicide_notes:
      "A Minnesota case study cut and treated stumps with an 18% glyphosate mix (plus tracking dye) in early November, after most native vegetation had gone dormant, and found 100% kill across 20 stumps ranging from 0.3 to 4.7 in diameter, with no stump sprouting. Seedlings too small to cut (under 0.3 in) are better treated with a foliar glyphosate spray.",
    source_links: [
      "https://www.invasiveplantatlas.org/subject.cfm?sub=3070",
      "https://mipncontroldatabase.wisc.edu/search?name=common%20buckthorn",
    ],
    active_months: [6, 7, 8, 10, 11],
  },
  {
    common_name: "Japanese barberry",
    scientific_name: "Berberis thunbergii",
    category: "shrub",
    id_summary:
      "Compact, dense shrub rarely exceeding 4 ft tall, often wider via layering where drooping branches root on contact with the ground; small, spoon-shaped leaves in clusters, smooth-edged, thick and leathery, bright green (sometimes tinged red/purple); creamy yellow 6-petaled flowers in clusters of two to four in spring; bright red oval berries (1/4 in) singly or in clusters of up to four, persisting through winter; deeply grooved, rusty brown stems with single spines and vivid yellow inner bark.",
    id_key_tell:
      "A single spine at each stem node (vs. three-pronged spines on native/naturalized barberry look-alikes), and vivid yellow inner bark visible when a stem is nicked.",
    removal_summary:
      "Illegal to sell, propagate, or intentionally plant in Pennsylvania, with limited sterile-cultivar exceptions. Hand-pull whole plants (wearing puncture-resistant gloves — spine tips are finer than a hypodermic needle) before seed-set for small populations; mowing or top removal alone will not control it since the plant vigorously resprouts from stump tissue. Foliar, basal bark, and cut-stem herbicide treatments are all effective; experimental flame-weeding tops out around 40% mortality, well below the ~93% seen with foliar triclopyr.",
    best_timing:
      "Mid-May to onset of fall color for foliar spray; basal bark and cut-stem treatments can be made year-round since the plant leafs out early and holds leaves late.",
    herbicide_notes:
      "Glyphosate or triclopyr alone are each effective as a foliar spray; a 2:1 glyphosate:triclopyr mix broadens the control spectrum with minimal added nontarget risk. Add a dye to the mix to track coverage.",
    source_links: [
      "https://extension.psu.edu/japanese-barberry",
      "https://extension.psu.edu/japanese-barberry-accurate-identification",
    ],
    active_months: [5, 6, 7, 8, 9, 10],
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
    id_summary:
      "Biennial thistle forming a basal rosette 4-18 in wide the first year, then bolting to as tall as 6-7 ft with spiny-winged stems in a later year (typically the second); leaves are green, lanceolate to oblong-lanceolate, coarsely lobed, and very prickly, with a silvery midrib and edges; showy, solitary, hemispherical, red-to-purple disk flowers bloom June-September with spine-tipped, overlapping bracts (phyllaries); seeds are small achenes with a white-to-light-brown pappus.",
    id_key_tell:
      "Large (1.5-3 in), nodding flower heads with spine-tipped bracts. Musk thistle can hybridize with, and is very similar at the rosette stage to, plumeless thistle.",
    removal_summary:
      "As a biennial, destroying the plant before it sets seed makes this largely a 1-3 season fix rather than an indefinite program, though seedbank monitoring should continue. Hand-pulling, digging, or cutting the taproot 1-2 in below the surface works well on individual plants; mowing near ground level just after flower-head emergence, but before seeds enlarge, can suppress populations if repeated. Two biocontrol insects (Puccinia carduorum, Rhinocyllus conicus) are established in parts of the Midwest, though R. conicus also attacks native thistles. Foliar herbicide is the most reliable option for larger infestations.",
    best_timing:
      "Spring, to rosettes, bolting, or flowering plants; or fall, to rosettes as long as leaves are still green. Applications to rosettes in spring or fall are the most effective window.",
    herbicide_notes:
      "2,4-D is the most widely available novice-level option; aminopyralid (Milestone), clopyralid (Transline), and picloram (Tordon K) are professional-use options that also carry over to control seedlings that germinate afterward. Glyphosate and imazapyr are nonselective and will kill surrounding vegetation.",
    source_links: [
      "https://www.invasiveplantatlas.org/subject.cfm?sub=3011",
      "https://mipncontroldatabase.wisc.edu/search?name=musk%20thistle",
    ],
    active_months: [4, 5, 9, 10],
  },
  {
    common_name: "Leafy spurge",
    scientific_name: "Euphorbia virgata",
    category: "forb",
    id_summary:
      "Erect, perennial herbaceous plant 6-36 in tall with smooth, often bluish-green stems that grow in clusters from an extensive, deep root system; a white milky latex oozes from any broken stem or leaf; leaves are linear, alternate, smooth-edged, 0.25-0.5 in wide and 1-4 in long; small green flowers are borne in clusters of showy yellow-green bracts starting in late spring; seed capsules are three-lobed and explode when mature, flinging seeds up to 15 ft.",
    id_key_tell:
      "Cutting the stem or a leaf releases a white, milky latex sap — the fastest field check. Roots include both a deep taproot reaching to the water table and lateral roots extending up to 15 ft beyond the main plant.",
    removal_summary:
      "A multi-year program, not a one-time treatment — even a strong combination of methods typically takes 4-5 years to reach greater than 95% suppression, and root fragments left behind after pulling will resprout. Repeated mowing (every 2-4 weeks through the growing season) and prescribed burning suppress top growth and improve herbicide uptake on regrowth but don't eradicate on their own. Three biocontrol flea beetles (Aphthona spp.) are available, and grazing with sheep or goats, especially combined with a fall herbicide treatment, is one of the more effective non-chemical options.",
    best_timing:
      "Two herbicide passes per year: once at the late-bud stage as bracts begin to yellow, and again in fall on 4-6 in regrowth before a killing frost. Fall applications generally give the most consistent results.",
    herbicide_notes:
      "2,4-D will not eliminate a population alone even after years of use, but pairs well with other methods and stops spring seed production. Picloram and picloram+2,4-D (Tordon) need 2-4 years of repeated applications; dicamba needs 2-3 years for over 80% control. Picloram is restricted-use and requires a certified applicator in most states.",
    source_links: [
      "https://www.invasiveplantatlas.org/subject.html?sub=3405",
      "https://mipncontroldatabase.wisc.edu/search?name=leafy%20spurge",
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

/**
 * Idempotent: safe to run on every boot, including against a DB that already has plant records
 * pointing at existing species rows. Updates the base text/metadata fields in place by
 * common_name — it never touches species.id, so existing plant.species_id foreign keys are
 * unaffected. This is what lets production content (id_summary, removal_summary, source_links,
 * etc.) pick up seed.ts edits without wiping the database. Note: if a species' common_name is
 * ever renamed here, its row will stop matching and silently stop updating.
 */
export function backfillSpeciesText(): void {
  if (SPECIES.length === 0) return;

  const update = db.prepare(`
    UPDATE species
    SET scientific_name = @scientific_name,
        category = @category,
        id_summary = @id_summary,
        id_key_tell = @id_key_tell,
        removal_summary = @removal_summary,
        best_timing = @best_timing,
        herbicide_notes = @herbicide_notes,
        source_links = @source_links,
        active_months = @active_months
    WHERE common_name = @common_name
  `);

  const updateMany = db.transaction((rows: SpeciesSeed[]) => {
    for (const row of rows) {
      update.run({
        ...row,
        source_links: JSON.stringify(row.source_links),
        active_months: JSON.stringify(row.active_months),
      });
    }
  });

  updateMany(SPECIES);
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
      url: "/species-photos/honeysuckle-psu-blossoms.jpg",
      caption: "Shrub honeysuckle blossoms",
      attribution: "Photo: Dave Jackson, Penn State Extension",
      source_url: "https://extension.psu.edu/shrub-honeysuckles",
    },
    {
      url: "/species-photos/honeysuckle-psu-flowers.jpg",
      caption: "Four-petaled flowers emerge in two pairs from the leaf axils (L. x bella)",
      attribution: "Photo: Dave Jackson and Kimberly Bohn, Penn State Extension",
      source_url: "https://extension.psu.edu/shrub-honeysuckles",
    },
    {
      url: "/species-photos/honeysuckle-psu-pith.jpg",
      caption: "Cut stem showing hollow center (pith) — key ID feature",
      attribution: "Photo: Dave Jackson and Kimberly Bohn, Penn State Extension",
      source_url: "https://extension.psu.edu/shrub-honeysuckles",
    },
    {
      url: "/species-photos/honeysuckle-psu-leaves-fruit.jpg",
      caption: "Opposite leaf arrangement and unripe fruit (L. maackii)",
      attribution: "Photo: Dave Jackson and Kimberly Bohn, Penn State Extension",
      source_url: "https://extension.psu.edu/shrub-honeysuckles",
    },
    {
      url: "/species-photos/honeysuckle-psu-ripe-fruit.jpg",
      caption: "Ripe fruit in groups of four (L. morrowii)",
      attribution: "Photo: Dave Jackson and Kimberly Bohn, Penn State Extension",
      source_url: "https://extension.psu.edu/shrub-honeysuckles",
    },
    {
      url: "/species-photos/honeysuckle-psu-bark.jpg",
      caption: "Stems with vertically striated, \"shredded\" bark",
      attribution: "Photo: Dave Jackson and Kimberly Bohn, Penn State Extension",
      source_url: "https://extension.psu.edu/shrub-honeysuckles",
    },
    {
      url: "/species-photos/honeysuckle-psu-calendar.jpg",
      caption: "Management calendar for shrub honeysuckle control",
      attribution: "Penn State Extension",
      source_url: "https://extension.psu.edu/shrub-honeysuckles",
    },
  ],
  "Sericea lespedeza (Chinese bush clover)": [
    {
      url: "/species-photos/sericea-atlas-0016188.jpg",
      caption: "Plant(s); dormant plant in February",
      attribution: "Photo: James H. Miller, USDA Forest Service, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=0016188",
    },
    {
      url: "/species-photos/sericea-atlas-0016190.jpg",
      caption: "Feature(s); Leaf backs (left) and leaf fronts (right) in July",
      attribution: "Photo: James H. Miller, USDA Forest Service, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=0016190",
    },
    {
      url: "/species-photos/sericea-atlas-1120169.jpg",
      caption: "Flower(s); in July",
      attribution: "Photo: James H. Miller, USDA Forest Service, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=1120169",
    },
    {
      url: "/species-photos/sericea-atlas-1237107.jpg",
      caption: "Flower(s)",
      attribution: "Photo: Dan Tenaglia, Missouriplants.com, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=1237107",
    },
    {
      url: "/species-photos/sericea-atlas-1330074.jpg",
      caption: "Foliage",
      attribution: "Photo: Chris Evans, University of Illinois, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=1330074",
    },
    {
      url: "/species-photos/sericea-atlas-1334069.jpg",
      caption: "Infestation",
      attribution: "Photo: Chris Evans, University of Illinois, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=1334069",
    },
    {
      url: "/species-photos/sericea-atlas-1334071.jpg",
      caption: "Infestation",
      attribution: "Photo: Chris Evans, University of Illinois, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=1334071",
    },
    {
      url: "/species-photos/sericea-atlas-1380358.jpg",
      caption: "Seedling(s)",
      attribution: "Photo: Chris Evans, University of Illinois, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=1380358",
    },
    {
      url: "/species-photos/sericea-atlas-2150058.jpg",
      caption: "Infestation; in a woodland setting",
      attribution: "Photo: Chris Evans, University of Illinois, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=2150058",
    },
    {
      url: "/species-photos/sericea-atlas-2150061.jpg",
      caption: "Infestation",
      attribution: "Photo: Chris Evans, University of Illinois, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=2150061",
    },
    {
      url: "/species-photos/sericea-atlas-2307243.jpg",
      caption: "Feature(s); February",
      attribution: "Photo: James H. Miller, USDA Forest Service, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=2307243",
    },
    {
      url: "/species-photos/sericea-atlas-5238024.jpg",
      caption: "Flower(s)",
      attribution: "Photo: Dan Tenaglia, Missouriplants.com, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=5238024",
    },
    {
      url: "/species-photos/sericea-atlas-5302020.jpg",
      caption: "Infestation",
      attribution: "Photo: Chuck Bargeron, University of Georgia, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=5302020",
    },
    {
      url: "/species-photos/sericea-atlas-5307079.jpg",
      caption: "Seed(s)",
      attribution: "Photo: Steve Hurst, USDA NRCS PLANTS Database, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=5307079",
    },
    {
      url: "/species-photos/sericea-atlas-5392254.jpg",
      caption: "Twig(s)/Shoot(s); shoot and leaves",
      attribution: "Photo: John M. Randall, The Nature Conservancy, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=5392254",
    },
    {
      url: "/species-photos/sericea-atlas-9005061.jpg",
      caption: "Seed(s); in February",
      attribution: "Photo: James H. Miller, USDA Forest Service, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=9005061",
    },
  ],
  "Callery / Bradford pear": [
    {
      url: "/species-photos/callery-pear-psu-hero.jpg",
      caption: "Callery pear",
      attribution: "Photo: Dave Jackson, Penn State Extension",
      source_url: "https://extension.psu.edu/callery-pear",
    },
    {
      url: "/species-photos/callery-pear-psu-leaves.jpg",
      caption: "Leaves showing wavy, serrated edge",
      attribution: "Penn State Extension",
      source_url: "https://extension.psu.edu/callery-pear",
    },
    {
      url: "/species-photos/callery-pear-psu-flowers.jpg",
      caption: "Five-petaled flowers in a ball-shaped bundle",
      attribution: "Photo: Eric Burkhart, Penn State Extension",
      source_url: "https://extension.psu.edu/callery-pear",
    },
    {
      url: "/species-photos/callery-pear-psu-fruit.jpg",
      caption: "Tiny, pear-shaped fruit, green to brown and flecked with pale dots",
      attribution: "Penn State Extension",
      source_url: "https://extension.psu.edu/callery-pear",
    },
    {
      url: "/species-photos/callery-pear-psu-bark-stems.jpg",
      caption: "Scaly, fissured bark (left) and a stout spine on a naturalized tree (right)",
      attribution: "Penn State Extension",
      source_url: "https://extension.psu.edu/callery-pear",
    },
    {
      url: "/species-photos/callery-pear-psu-habit.jpg",
      caption: "Callery pear invading early successional habitat",
      attribution: "Photo: Dave Jackson and Eric Burkhart, Penn State Extension",
      source_url: "https://extension.psu.edu/callery-pear",
    },
    {
      url: "/species-photos/callery-pear-psu-calendar.png",
      caption: "Management calendar for Callery pear control",
      attribution: "Penn State Extension",
      source_url: "https://extension.psu.edu/callery-pear",
    },
  ],
  "Tree-of-heaven": [
    {
      url: "/species-photos/tree-of-heaven-psu-hero.jpg",
      caption: "Tree-of-heaven leaves",
      attribution: "Credit: Bigstock, via Penn State Extension",
      source_url: "https://extension.psu.edu/tree-of-heaven",
    },
    {
      url: "/species-photos/tree-of-heaven-psu-bark.jpg",
      caption: "Bark, smooth and brownish-green when young",
      attribution: "Photo: Dave Jackson, Penn State Extension",
      source_url: "https://extension.psu.edu/tree-of-heaven",
    },
    {
      url: "/species-photos/tree-of-heaven-psu-leaf.jpg",
      caption: "One compound leaf with many leaflets",
      attribution: "Photo: Dave Jackson, Penn State Extension",
      source_url: "https://extension.psu.edu/tree-of-heaven",
    },
    {
      url: "/species-photos/tree-of-heaven-psu-leaf-margin.jpg",
      caption: "Leaf margin showing the gland teeth near the leaflet base — key ID feature",
      attribution: "Photo: Dave Jackson, Penn State Extension",
      source_url: "https://extension.psu.edu/tree-of-heaven",
    },
    {
      url: "/species-photos/tree-of-heaven-psu-pith.jpg",
      caption: "Broken twig showing the large, spongy brown pith",
      attribution: "Photo: Dave Jackson, Penn State Extension",
      source_url: "https://extension.psu.edu/tree-of-heaven",
    },
    {
      url: "/species-photos/tree-of-heaven-psu-leaf-scar.jpg",
      caption: "Large V- or heart-shaped leaf scar",
      attribution: "Photo: Dave Jackson, Penn State Extension",
      source_url: "https://extension.psu.edu/tree-of-heaven",
    },
    {
      url: "/species-photos/tree-of-heaven-psu-seeds.jpg",
      caption: "Close-up of seeds (samaras)",
      attribution: "Photo: Dave Jackson, Penn State Extension",
      source_url: "https://extension.psu.edu/tree-of-heaven",
    },
    {
      url: "/species-photos/tree-of-heaven-psu-colony.jpg",
      caption: "Clonal patches growing along a highway",
      attribution: "Photo: Dave Jackson, Penn State Extension",
      source_url: "https://extension.psu.edu/tree-of-heaven",
    },
    {
      url: "/species-photos/tree-of-heaven-psu-calendar.png",
      caption: "Management calendar for tree-of-heaven control",
      attribution: "Penn State Extension",
      source_url: "https://extension.psu.edu/tree-of-heaven",
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
      url: "/species-photos/olives-psu-russian-flowers.jpg",
      caption: "Russian olive flowers",
      attribution: "Photo: Paul Wray, Iowa State University, Bugwood.org, CC BY, via Penn State Extension",
      source_url: "https://extension.psu.edu/invasive-autumn-and-russian-olives",
    },
    {
      url: "/species-photos/olives-psu-russian-leaves-flowers.jpg",
      caption: "Russian olive leaves and flowers",
      attribution: "Eigenes Werk, NC State Extension, CC0 1.0, via Penn State Extension",
      source_url: "https://extension.psu.edu/invasive-autumn-and-russian-olives",
    },
    {
      url: "/species-photos/olives-psu-autumn-landscape.jpg",
      caption: "Autumn olive in the landscape — the species Russian olive is most often confused with",
      attribution: "Photo: Leslie J. Mehrhoff, University of Connecticut, Bugwood.org, CC BY, via Penn State Extension",
      source_url: "https://extension.psu.edu/invasive-autumn-and-russian-olives",
    },
  ],
  "Autumn olive": [
    {
      url: "/species-photos/autumn-olive-psu-hero.jpg",
      caption: "Autumn olive branch in flower",
      attribution: "Photo: Dave Jackson, Penn State Extension",
      source_url: "https://extension.psu.edu/autumn-olive",
    },
    {
      url: "/species-photos/autumn-olive-psu-flowers.jpg",
      caption: "Small white flowers in clusters",
      attribution: "Photo: Dave Jackson, Penn State Extension",
      source_url: "https://extension.psu.edu/autumn-olive",
    },
    {
      url: "/species-photos/autumn-olive-psu-spine-stem.jpg",
      caption: "Brown stem and a stout spine",
      attribution: "Photo: Dave Jackson, Penn State Extension",
      source_url: "https://extension.psu.edu/autumn-olive",
    },
    {
      url: "/species-photos/autumn-olive-psu-leaves-fruit.jpg",
      caption: "Leaves and green, immature fruit clusters",
      attribution: "Photo: Dave Jackson, Penn State Extension",
      source_url: "https://extension.psu.edu/autumn-olive",
    },
    {
      url: "/species-photos/autumn-olive-psu-ripe-fruit.jpg",
      caption: "Mature fruit, red with tan specks",
      attribution: "Photo: Dave Jackson, Penn State Extension",
      source_url: "https://extension.psu.edu/autumn-olive",
    },
    {
      url: "/species-photos/autumn-olive-psu-leaf-underside.jpg",
      caption: "Leaves glossy green above, silvery underneath — key ID feature",
      attribution: "Photo: Dave Jackson, Penn State Extension",
      source_url: "https://extension.psu.edu/autumn-olive",
    },
    {
      url: "/species-photos/autumn-olive-psu-growth-form.jpg",
      caption: "Growth form of a mature shrub in full sun",
      attribution: "Photo: Dave Jackson, Penn State Extension",
      source_url: "https://extension.psu.edu/autumn-olive",
    },
    {
      url: "/species-photos/autumn-olive-psu-calendar.png",
      caption: "Management calendar for autumn olive control",
      attribution: "Penn State Extension",
      source_url: "https://extension.psu.edu/autumn-olive",
    },
  ],
  "Common buckthorn": [
    {
      url: "/species-photos/buckthorn-atlas-1330016.jpg",
      caption: "Flower(s)",
      attribution: "Photo: Chris Evans, University of Illinois, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=1330016",
    },
    {
      url: "/species-photos/buckthorn-atlas-0008306.jpg",
      caption: "Foliage",
      attribution: "Photo: Paul Wray, Iowa State University, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=0008306",
    },
    {
      url: "/species-photos/buckthorn-atlas-0008184.jpg",
      caption: "Fruit(s)",
      attribution: "Photo: Paul Wray, Iowa State University, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=0008184",
    },
    {
      url: "/species-photos/buckthorn-atlas-1334007.jpg",
      caption: "Feature(s); pointed spine at the end of the stem — key ID feature",
      attribution: "Photo: Chris Evans, University of Illinois, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=1334007",
    },
    {
      url: "/species-photos/buckthorn-atlas-5308069.jpg",
      caption: "Plant(s); botanical illustration (Britton & Brown, Illustrated Flora of the Northern States and Canada, 1913)",
      attribution: "USDA NRCS PLANTS Database, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=5308069",
    },
  ],
  "Japanese barberry": [
    {
      url: "/species-photos/barberry-psu-hero.jpg",
      caption: "Japanese barberry plant",
      attribution: "Photo: Dave Jackson, Penn State Extension",
      source_url: "https://extension.psu.edu/japanese-barberry",
    },
    {
      url: "/species-photos/barberry-psu-architecture.jpg",
      caption: "Whole-plant architecture",
      attribution: "Photo: Dave Jackson, Penn State Extension",
      source_url: "https://extension.psu.edu/japanese-barberry",
    },
    {
      url: "/species-photos/barberry-psu-spines-leaves.jpg",
      caption: "Spines and leaves on new growth",
      attribution: "Photo: Dave Jackson, Penn State Extension",
      source_url: "https://extension.psu.edu/japanese-barberry",
    },
    {
      url: "/species-photos/barberry-psu-stem.jpg",
      caption: "Stem showing vivid yellow inner bark — key ID feature",
      attribution: "Photo: Dave Jackson, Penn State Extension",
      source_url: "https://extension.psu.edu/japanese-barberry",
    },
    {
      url: "/species-photos/barberry-psu-flowers.jpg",
      caption: "Flower clusters",
      attribution: "Photo: Dave Jackson, Penn State Extension",
      source_url: "https://extension.psu.edu/japanese-barberry",
    },
    {
      url: "/species-photos/barberry-psu-infestation.jpg",
      caption: "Understory infestation",
      attribution: "Photo: Dave Jackson, Penn State Extension",
      source_url: "https://extension.psu.edu/japanese-barberry",
    },
    {
      url: "/species-photos/barberry-psu-fall-fruit.jpg",
      caption: "Fall color and fruit",
      attribution: "Photo: Dave Jackson, Penn State Extension",
      source_url: "https://extension.psu.edu/japanese-barberry",
    },
    {
      url: "/species-photos/barberry-psu-calendar.jpg",
      caption: "Management calendar for Japanese barberry control",
      attribution: "Penn State Extension",
      source_url: "https://extension.psu.edu/japanese-barberry",
    },
  ],
  "Old World / Caucasian bluestems": [
    {
      url: "/species-photos/bluestem-atlas-5414456.jpg",
      caption: "Plant(s); Caucasian bluestem (Bothriochloa bladhii) herbarium specimen",
      attribution: "Photo: Forest and Kim Starr, Starr Environmental, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=5414456",
    },
    {
      url: "/species-photos/bluestem-atlas-5414457.jpg",
      caption: "Plant(s); Caucasian bluestem (Bothriochloa bladhii) herbarium specimen",
      attribution: "Photo: Forest and Kim Starr, Starr Environmental, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=5414457",
    },
    {
      url: "/species-photos/bluestem-atlas-5474289.jpg",
      caption: "Plant(s); yellow bluestem (Bothriochloa ischaemum), invasive stand in Texas",
      attribution: "Photo: Michelle Villafranca, Fort Worth Nature Center & Refuge, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=5474289",
    },
    {
      url: "/species-photos/bluestem-atlas-5474287.jpg",
      caption: "Plant(s); yellow bluestem (Bothriochloa ischaemum), invasive in Texas",
      attribution: "Photo: Michelle Villafranca, Fort Worth Nature Center & Refuge, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=5474287",
    },
    {
      url: "/species-photos/bluestem-atlas-5474291.jpg",
      caption: "Foliage; yellow bluestem (Bothriochloa ischaemum), invasive in Texas",
      attribution: "Photo: Michelle Villafranca, Fort Worth Nature Center & Refuge, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=5474291",
    },
    {
      url: "/species-photos/bluestem-atlas-5474290.jpg",
      caption: "Flower(s); yellow bluestem (Bothriochloa ischaemum), invasive in Texas",
      attribution: "Photo: Michelle Villafranca, Fort Worth Nature Center & Refuge, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=5474290",
    },
    {
      url: "/species-photos/bluestem-atlas-5411021.jpg",
      caption: "Flower(s); yellow bluestem (Bothriochloa ischaemum), purplish seedhead panicle",
      attribution: "Photo: Karan A. Rawlins, University of Georgia, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=5411021",
    },
    {
      url: "/species-photos/bluestem-atlas-5411024.jpg",
      caption: "Flower(s); yellow bluestem (Bothriochloa ischaemum)",
      attribution: "Photo: Karan A. Rawlins, University of Georgia, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=5411024",
    },
    {
      url: "/species-photos/bluestem-atlas-5411042.jpg",
      caption: "Flower(s); yellow bluestem (Bothriochloa ischaemum)",
      attribution: "Photo: Karan A. Rawlins, University of Georgia, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=5411042",
    },
    {
      url: "/species-photos/bluestem-atlas-5411059.jpg",
      caption: "Flower(s); yellow bluestem (Bothriochloa ischaemum)",
      attribution: "Photo: Karan A. Rawlins, University of Georgia, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=5411059",
    },
  ],
  "Musk thistle": [
    {
      url: "/species-photos/musk-thistle-atlas-0001059.jpg",
      caption: "Flower(s)",
      attribution: "Photo: James R. Allison, Georgia Department of Natural Resources, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=0001059",
    },
    {
      url: "/species-photos/musk-thistle-atlas-1459777.jpg",
      caption: "Plant(s)",
      attribution: "Photo: Steve Dewey, Utah State University, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=1459777",
    },
    {
      url: "/species-photos/musk-thistle-atlas-0580013.jpg",
      caption: "Foliage; basal rosette",
      attribution: "Photo: Loke T. Kok, Virginia Polytechnic Institute and State University, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=0580013",
    },
    {
      url: "/species-photos/musk-thistle-atlas-1148159.jpg",
      caption: "Flower(s)",
      attribution: "Photo: USDA APHIS PPQ, Oxford, North Carolina, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=1148159",
    },
    {
      url: "/species-photos/musk-thistle-atlas-1334026.jpg",
      caption: "Flower(s); ready to set seed",
      attribution: "Photo: Wendy VanDyk Evans, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=1334026",
    },
    {
      url: "/species-photos/musk-thistle-atlas-1382013.jpg",
      caption: "Flower(s)",
      attribution: "Photo: Ricky Layson, Ricky Layson Photography, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=1382013",
    },
    {
      url: "/species-photos/musk-thistle-atlas-1459773.jpg",
      caption: "Flower(s)",
      attribution: "Photo: Steve Dewey, Utah State University, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=1459773",
    },
    {
      url: "/species-photos/musk-thistle-atlas-1539016.jpg",
      caption: "Plant(s)",
      attribution: "Photo: James H. Miller, USDA Forest Service, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=1539016",
    },
    {
      url: "/species-photos/musk-thistle-atlas-1237110.jpg",
      caption: "Stem(s); upper stem",
      attribution: "Photo: Dan Tenaglia, Missouriplants.com, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=1237110",
    },
    {
      url: "/species-photos/musk-thistle-atlas-1358309.jpg",
      caption: "Feature(s); stem and foliage",
      attribution: "Photo: Mary Ellen (Mel) Harte, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=1358309",
    },
    {
      url: "/species-photos/musk-thistle-atlas-1237112.jpg",
      caption: "Plant(s); lower stem",
      attribution: "Photo: Dan Tenaglia, Missouriplants.com, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=1237112",
    },
    {
      url: "/species-photos/musk-thistle-atlas-1459768.jpg",
      caption: "Infestation",
      attribution: "Photo: Steve Dewey, Utah State University, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=1459768",
    },
    {
      url: "/species-photos/musk-thistle-atlas-5374308.jpg",
      caption: "Infestation",
      attribution: "Photo: Joseph M. DiTomaso, University of California - Davis, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=5374308",
    },
    {
      url: "/species-photos/musk-thistle-atlas-0024053.jpg",
      caption: "Infestation",
      attribution: "Photo: Norman E. Rees, USDA Agricultural Research Service (Retired), Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=0024053",
    },
    {
      url: "/species-photos/musk-thistle-atlas-5437943.jpg",
      caption: "Foliage",
      attribution: "Photo: Bruce Ackley, The Ohio State University, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=5437943",
    },
    {
      url: "/species-photos/musk-thistle-atlas-1459772.jpg",
      caption: "Infestation",
      attribution: "Photo: Steve Dewey, Utah State University, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=1459772",
    },
    {
      url: "/species-photos/musk-thistle-atlas-1358312.jpg",
      caption: "Flower(s)",
      attribution: "Photo: Mary Ellen (Mel) Harte, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=1358312",
    },
    {
      url: "/species-photos/musk-thistle-atlas-5437946.jpg",
      caption: "Seed(s)",
      attribution: "Photo: Bruce Ackley, The Ohio State University, Bugwood.org",
      source_url: "https://www.invasive.org/browse/detail.cfm?imgnum=5437946",
    },
  ],
  "Leafy spurge": [
    {
      url: "/species-photos/leafy-spurge-mipn-1.jpg",
      caption: "Leafy spurge foliage and yellow-green flower bracts",
      attribution: "Midwest Invasive Plant Network (MIPN) Control Database",
      source_url: "https://mipncontroldatabase.wisc.edu/search?name=leafy%20spurge",
    },
    {
      url: "/species-photos/leafy-spurge-mipn-2.jpg",
      caption: "Leafy spurge stand",
      attribution: "Midwest Invasive Plant Network (MIPN) Control Database",
      source_url: "https://mipncontroldatabase.wisc.edu/search?name=leafy%20spurge",
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
      name: "Fly honeysuckle & other native bush honeysuckles",
      scientific_name: "Lonicera canadensis; Diervilla lonicera",
      how_to_tell:
        "Native honeysuckles have a solid pith, while every species in the invasive shrub honeysuckle complex has a hollow pith at any stem size — slice a stem lengthwise to check.",
      photo: null,
    },
    {
      name: "Native viburnums",
      scientific_name: "Viburnum spp.",
      how_to_tell:
        "Viburnums also branch oppositely, but their leaf margins are toothed or lobed (not smooth-edged like invasive honeysuckle) and their stems have a solid pith rather than a hollow one.",
      photo: null,
    },
  ],
  "Callery / Bradford pear": [
    {
      name: "Flowering dogwood & viburnums (native)",
      scientific_name: "Cornus florida; Viburnum spp.",
      how_to_tell:
        "Both have similarly rounded, leathery leaves, but dogwood and viburnum leaves are arranged oppositely on the stem, while Callery pear's leaves are alternate.",
      photo: null,
    },
    {
      name: "Alternate-leaf dogwood (native)",
      scientific_name: "Cornus alternifolia",
      how_to_tell:
        "Also has alternate leaves and flowers, but its branches emerge in whorls with a horizontally tiered growth form, unlike the tight, upright forks typical of Callery pear.",
      photo: null,
    },
  ],
  "Tree-of-heaven": [
    {
      name: "Staghorn sumac (native)",
      scientific_name: "Rhus typhina",
      how_to_tell:
        "Sumac leaflets are toothed along their entire margin, unlike tree-of-heaven's smooth-edged leaflets (except for the gland teeth near the base). Crushed tree-of-heaven foliage also has a strong offensive odor that sumac lacks.",
      photo: null,
    },
    {
      name: "Black walnut & hickory (native)",
      scientific_name: "Juglans nigra; Carya spp.",
      how_to_tell:
        "Both have large pinnately compound leaves like tree-of-heaven, but their leaflets are toothed along the whole margin rather than smooth-edged, and neither produces tree-of-heaven's rank odor when crushed.",
      photo: null,
    },
  ],
  "Russian olive": [
    {
      name: "Autumn olive",
      scientific_name: "Elaeagnus umbellata",
      how_to_tell:
        "The two are often confused (and even used interchangeably) since they're ecologically similar and take the same control treatment, but Russian olive grows into a real tree form with narrower, drooping, willow-like leaves and yellow flowers, while autumn olive stays shrubbier with broader leaves and white-to-pale-yellow flowers. Autumn olive is far more common in Pennsylvania; Russian olive is far more common out west.",
      photo: {
        url: "/species-photos/olives-psu-autumn-fruits.jpg",
        caption: "Autumn olive fruits — the species Russian olive is most often confused with",
        attribution: "Photo: Lotus Johnson, NC State Extension, CC BY-NC 4.0, via Penn State Extension",
        source_url: "https://extension.psu.edu/invasive-autumn-and-russian-olives",
      },
    },
  ],
  "Autumn olive": [
    {
      name: "Russian olive",
      scientific_name: "Elaeagnus angustifolia",
      how_to_tell:
        "Often used interchangeably with autumn olive, but Russian olive grows into a true tree form (autumn olive stays shrubbier) with narrower, drooping, willow-like leaves and yellow flowers rather than autumn olive's white-to-pale-yellow flowers. Russian olive is far more common in the western U.S.; autumn olive dominates in the east, including Pennsylvania. Both are ecologically similar and require the same control treatment.",
      photo: null,
    },
  ],
  "Japanese barberry": [
    {
      name: "Allegheny barberry (native) & European barberry",
      scientific_name: "Berberis canadensis; Berberis vulgaris",
      how_to_tell:
        "Japanese barberry has a single spine at each stem node and smooth-edged leaves. Both Allegheny and European barberry have three-pronged spines and leaves with coarse serrations (teeth) along the edge. Allegheny barberry is considered possibly extirpated from Pennsylvania; European barberry is much less common than Japanese barberry.",
      photo: null,
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
      name: "Plumeless thistle",
      scientific_name: "Carduus acanthoides",
      how_to_tell:
        "The two are very similar at the rosette stage and can hybridize with each other. Musk thistle's mature flower heads are notably larger and nod/droop; plumeless thistle's flower heads are smaller and more erect.",
      photo: null,
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
      timing: "Any time, especially when soil is moist",
      herbicide: "",
      how_to: "Pull small, shallow-rooted plants by hand; larger stems can be removed with lever-type wrenching tools, or cut with loppers, saws, or a brush-hog.",
      notes: "Not a standalone treatment for larger stems — mowing or cutting alone causes vigorous resprouting and must be followed by herbicide.",
    },
    {
      method: "Foliar spray",
      timing: "Full leaf expansion to onset of fall color (roughly June-October)",
      herbicide: "Ranger Pro or AquaNeat (glyphosate) 3-4 quarts/acre, alone or plus water-based triclopyr (Garlon 3A or Vastlan) 1.5-2 quarts/acre",
      how_to: "Broadcast or backpack-spray foliage; treating regrowth in fall after mowing is often easier than treating stumps.",
      notes: "Glyphosate alone works well if honeysuckle is the only target; triclopyr alone is NOT effective as a foliar spray on this species.",
    },
    {
      method: "Basal bark",
      timing: "Year-round, weather permitting",
      herbicide: "Pathfinder II (ready-to-use), or Garlon 4 Ultra (triclopyr ester) 20%, 1:4 in basal oil",
      how_to: "Apply to the full circumference of the lower 12-15 inches of stem.",
      notes: "Reliable only on stems 2 inches or less in diameter; larger stems should be cut and stump-treated instead.",
    },
    {
      method: "Cut-stump",
      timing: "Year-round, weather permitting",
      herbicide: "Oil-based triclopyr ester, ready-to-use or 20% in oil (1:4), or glyphosate 50% in water (1:1)",
      how_to: "Cut stems near the soil line; apply oil-based triclopyr anytime after cutting, or water-based glyphosate immediately after cutting.",
      notes: "Add a colorant/dye to track treated stumps and avoid skips or duplicate treatment.",
    },
  ],
  "Sericea lespedeza (Chinese bush clover)": [
    {
      method: "Mechanical / hand-pull",
      timing: "Seedlings and young plants, when soil allows full root removal",
      herbicide: "",
      how_to: "Pull by hand, removing the entire root — older plants develop a deep taproot that resists pulling.",
      notes: "If seed pods are present, bag the material and dispose of it in a landfill to avoid spreading seed.",
    },
    {
      method: "Mowing",
      timing: "Flower-bud stage, before seed forms; repeat whenever regrowth reaches 12-18 in",
      herbicide: "",
      how_to: "Mow at the bud stage and repeat through the season.",
      notes: "Two to three years of mowing typically suppresses an established population. Never mow when mature seed is present.",
    },
    {
      method: "Grazing",
      timing: "Ongoing, heavy stocking, especially after a spring burn",
      herbicide: "",
      how_to: "Goats browse lespedeza readily and can eliminate adult plants after about 3 years of heavy-stocking grazing; cattle will only forage on early growth, and are more effective after a spring burn.",
      notes: "Confine grazing stock until any consumed seed has passed through their digestive system before moving them to a new area, to avoid spreading seed.",
    },
    {
      method: "Foliar spray",
      timing: "Flower-bud stage for most products; metsulfuron can be applied from blooming to killing frost",
      herbicide: "Metsulfuron (Escort XP) 0.3-0.5 oz/acre, or triclopyr (Garlon 4) 16-24 fl oz/acre, or triclopyr+fluroxypyr (PastureGard HL) 12-24 fl oz/acre, or glyphosate 1-2 lb a.e./acre",
      how_to: "Broadcast or spot-spray at the flower-bud stage for the best results.",
      notes: "A Stoddard County, Missouri CRP case study reported 95-98% control the year of a September metsulfuron application, holding above 95% the following year with no resprouts, even in a previously heavy infestation.",
    },
  ],
  "Callery / Bradford pear": [
    {
      method: "Mechanical / hand-pull",
      timing: "Any time; before fruit sets in spring/early summer to stop seed spread",
      herbicide: "",
      how_to: "Pull small plants by hand, removing all roots — root fragments often resprout. Isolated larger stems can be cut with a chainsaw for access.",
      notes: "Cutting or mowing alone will not kill the plant and provides only temporary cover reduction; it must be followed by herbicide.",
    },
    {
      method: "Foliar spray",
      timing: "Mid-May to onset of fall color",
      herbicide: "Aquaneat (glyphosate) 3 qt/acre plus Garlon 3A (triclopyr) 2 qt/acre, or Vastlan (triclopyr) 1.5 qt/acre alone",
      how_to: "Backpack-spray sites with low-to-moderate density of trees under 10 feet tall.",
      notes: "This mix also controls other invasive shrubs, such as autumn olive and bush honeysuckle, often found growing nearby.",
    },
    {
      method: "Basal bark",
      timing: "Year-round, weather permitting",
      herbicide: "Pathfinder II (ready-to-use), or Garlon 4 Ultra (triclopyr ester) 20%, 1:4 in basal oil",
      how_to: "Wet the full circumference of the lower 12-18 inches of stem; effective on stems up to 6 inches basal diameter.",
      notes: "For stems over 6 inches, switch to hack-and-squirt.",
    },
    {
      method: "Cut-stump",
      timing: "Year-round",
      herbicide: "Oil-based triclopyr ester 1:4 in oil, or water-based Aquaneat/Garlon 3A/Vastlan 1:1 with water",
      how_to: "Apply the oil-based mix to the cut surface and stump sides anytime after cutting; apply the water-based mix to the fresh-cut surface immediately after cutting.",
      notes: "Add a dye/colorant to track treated stumps and avoid duplicate treatment.",
    },
    {
      method: "Hack-and-squirt",
      timing: "Year-round (stems over 6 inches basal diameter)",
      herbicide: "Aquaneat (glyphosate), or Garlon 3A/Vastlan (triclopyr), 1:1 with water",
      how_to: "Make downward-angled cuts around the stem — girdling if dormant, spaced about 1 inch apart if actively growing — and fill each cut with herbicide.",
      notes: "Avoids felling the tree while still delivering herbicide to the roots.",
    },
  ],
  "Tree-of-heaven": [
    {
      method: "Mechanical / hand-pull",
      timing: "Any time soil is moist — seedlings only",
      herbicide: "",
      how_to: "Hand-pull young seedlings, removing the entire root system — fragments will resprout.",
      notes: "Cutting or mowing a rooted tree does NOT kill it — it triggers massive root suckering up to 50 ft away. Never cut without an herbicide follow-up. Seedlings can be confused with root suckers, which are nearly impossible to hand-pull.",
    },
    {
      method: "Foliar spray",
      timing: "Mid- to late growing season (July 1 to onset of fall color)",
      herbicide: "Rodeo (glyphosate) 3 qt/acre plus Garlon 3A (2 qt/acre) or Vastlan (1.5 qt/acre) triclopyr",
      how_to: "Apply with truck-mounted or backpack sprayers where tree height and distribution allow full coverage without contacting desirable plants.",
      notes: "For dense infestations, treat low growth first with foliar spray, then follow up with basal bark or hack-and-squirt on the remaining larger stems.",
    },
    {
      method: "Basal bark",
      timing: "July 1 to onset of fall color",
      herbicide: "Pathfinder II (ready-to-use), or Garlon 4 Ultra (triclopyr ester) 20%, 1:4 in basal oil",
      how_to: "Wet the full circumference of the lower 12-18 inches on stems under 6 inches basal diameter, using a low-volume backpack sprayer.",
      notes: "Best for small infestations or as a follow-up after a foliar application. If stems are larger than 6 inches, use hack-and-squirt instead.",
    },
    {
      method: "Hack-and-squirt",
      timing: "July 1 to onset of fall color (avoid periods of heavy sap flow)",
      herbicide: "Rodeo (glyphosate), or Garlon 3A/Vastlan (triclopyr), undiluted or 1:1 with water",
      how_to: "Make downward-angled cuts spaced evenly around the stem (about one hack per inch of diameter, minimum two), leaving intact bark between them, and fill each cut with herbicide using a squirt bottle.",
      notes: "Do not completely girdle the stem — the herbicide needs uncut living tissue between the hacks to translocate to the roots.",
    },
    {
      method: "Cut-stump",
      timing: "N/A — not recommended as primary control",
      herbicide: "",
      how_to: "If a tree must be cut immediately for safety, treat it with one of the above herbicide methods first, wait about 30 days for symptoms to develop, then cut.",
      notes: "Cut-stump herbicide applications do not control roots and will not prevent root suckering.",
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
      timing: "After rain, when the ground is soft and moist",
      herbicide: "",
      how_to: "Pull or dig up young plants and small infestations by hand, ensuring the complete root system is removed.",
      notes: "Incomplete root removal allows the plant to resprout.",
    },
    {
      method: "Cut-stump",
      timing: "July through September, or during winter dormancy",
      herbicide: "A systemic herbicide (Penn State Extension does not publish a specific product or rate for this species)",
      how_to: "Cut the stem and apply a systemic herbicide to the stump immediately after cutting to prevent regeneration.",
      notes: "Cutting alone is ineffective — resprouting can produce even denser growth than before. Always follow the herbicide label.",
    },
  ],
  "Autumn olive": [
    {
      method: "Mechanical",
      timing: "Any time; cutting is a helpful first step before herbicide",
      herbicide: "",
      how_to: "Pull or dig small plants by hand. For larger stems, cut with heavy-duty rotary/flail cutters (\"bush hogs\"); large stems can be cut and chipped with fixed-tooth, drum-type forestry cutters.",
      notes: "Cutting/mowing alone is not effective — it must be followed by herbicide applied to cut surfaces or regrowth.",
    },
    {
      method: "Foliar spray",
      timing: "June to onset of fall color",
      herbicide: "Garlon 3A or Vastlan (triclopyr) 1.5-2 qt/acre alone, or AquaNeat (glyphosate) 3 qt/acre plus triclopyr 1.5-2 qt/acre for multiple targets",
      how_to: "Backpack-spray sites with low-to-moderate plant density; selectively treat knee-to-waist-high resprouts after mowing.",
      notes: "Glyphosate alone is NOT effective on autumn olive — triclopyr is the key active ingredient.",
    },
    {
      method: "Basal bark",
      timing: "Year-round",
      herbicide: "Pathfinder II (ready-to-use), or Garlon 4 Ultra (triclopyr ester) 20%, 1:4 in basal oil",
      how_to: "Apply to the full circumference of the lower 12-18 inches of intact stem.",
      notes: "",
    },
    {
      method: "Cut-stump",
      timing: "Year-round",
      herbicide: "Oil-based triclopyr ester 1:4 in oil (anytime after cutting), or Garlon 3A/Vastlan 1:1 with water (immediately after cutting)",
      how_to: "Cut stems and apply the herbicide to the fresh cut surface, and to the stump sides for the oil-based mix.",
      notes: "Add a colorant to track treated stumps and avoid skips or duplicate treatment.",
    },
  ],
  "Common buckthorn": [
    {
      method: "Mechanical / hand-pull or dig",
      timing: "Before seed is produced",
      herbicide: "",
      how_to: "Plants under 0.4 in diameter pull easily from moist soil; larger stems (0.5-1.5 in) can be dug or pulled.",
      notes: "Remove the root crown, not just above-ground growth, to prevent resprouting.",
    },
    {
      method: "Mowing",
      timing: "Winter, if possible, to avoid damaging desirable vegetation",
      herbicide: "",
      how_to: "Mow to remove above-ground growth; cutting before seed is produced in summer and again after fall resprouting reduces the vigor of the following year's resprouts.",
      notes: "Rarely kills established plants on its own — pair with foliar herbicide for better effectiveness. Mulching mowed material on-site can reduce seedling recruitment; avoid moving cut material off-site if seed is present.",
    },
    {
      method: "Grazing",
      timing: "Two to three grazings in the first year, repeated in following years",
      herbicide: "",
      how_to: "Goats readily defoliate buckthorn and will strip and girdle bark, especially in winter and late spring; contain them with portable electric net fencing and monitor daily.",
      notes: "One documented case study found goats cleared about 300 sq ft each per day on the first grazing after spring leaf-out, with buckthorn resprouting in about 30 days. Repeated grazing eventually exhausts the plant's food reserves and kills it; some plants die after a single grazing, but partial recovery is more common.",
    },
    {
      method: "Foliar spray",
      timing: "When actively growing and fully leafed out",
      herbicide: "Glyphosate 1.7-3.7 lb a.e./acre broadcast, or triclopyr (Garlon 4) 4-8 lb a.e./acre broadcast",
      how_to: "Broadcast or spot-spray; a wick applicator works on shorter buckthorn growing among taller desirable species.",
      notes: "Glyphosate is nonselective and will injure any green foliage it contacts.",
    },
    {
      method: "Cut-stump",
      timing: "Any time of year",
      herbicide: "Glyphosate 20-50% spot solution, imazapyr (Stalker) 6-9% in oil, picloram (Tordon 22K) 50-100%, or triclopyr (Garlon 4) 20-30% in oil",
      how_to: "Cut the stem and apply herbicide to the cut surface. A documented Minnesota case study used an 18% glyphosate mix applied within minutes of cutting, with a tracking dye added.",
      notes: "That case study found 100% kill on 20 stumps from 0.3 to 4.7 in diameter, with no stump sprouting, when cut and treated in early November as native vegetation went dormant.",
    },
    {
      method: "Hack-and-squirt",
      timing: "Any time of year",
      herbicide: "Glyphosate 50-100% spot solution, imazapyr (Stalker) 6-9% in oil, picloram (Tordon 22K) 50%, or picloram+2,4-D (Tordon RTU)",
      how_to: "Make cuts into the stem spaced around its circumference and apply herbicide directly into each cut.",
      notes: "",
    },
    {
      method: "Basal bark",
      timing: "Any time of year",
      herbicide: "Imazapyr (Stalker) 6-12% in oil, or triclopyr (Garlon 4) 1-5% in oil",
      how_to: "Apply the oil-based mixture to the lower stem, full circumference.",
      notes: "",
    },
  ],
  "Japanese barberry": [
    {
      method: "Mechanical / hand-pull",
      timing: "Early in the season, before seed set",
      herbicide: "",
      how_to: "Pull whole plants by hand (small sprouts) or with a hoe/mattock, wearing puncture-resistant gloves.",
      notes: "Best suited to small populations or ecologically sensitive sites. Mowing/top removal alone will not control barberry — it vigorously resprouts from stump tissue — but can reduce plant size before herbicide application.",
    },
    {
      method: "Foliar spray",
      timing: "Mid-May to onset of fall color",
      herbicide: "Aquaneat (glyphosate) 3 qt/acre, or Garlon 3A (triclopyr-salt) 2 qt/acre, or a glyphosate+triclopyr mix (3 qt/acre plus Garlon 3A 2 qt/acre or Vastlan 1.5 qt/acre)",
      how_to: "Backpack-spray sites with low-to-moderate target density; add a dye to avoid missed patches.",
      notes: "The glyphosate+triclopyr mix provides broader control when multiple invasive species are present and has practically no soil activity.",
    },
    {
      method: "Basal bark",
      timing: "Year-round",
      herbicide: "Pathfinder II (ready-to-use), or Garlon 4 Ultra (triclopyr ester) 20%, 1:4 in basal oil",
      how_to: "Apply to the full circumference of the lower 12-18 inches of intact stem.",
      notes: "",
    },
    {
      method: "Cut-stem",
      timing: "Year-round",
      herbicide: "Oil-based triclopyr ester 1:4 in oil (anytime after cutting), or Aquaneat/Garlon 3A/Vastlan 1:1 with water (immediately after cutting)",
      how_to: "Cut stems close to the soil line and treat the cut surface, and the stump sides for the oil-based mix.",
      notes: "Add a colorant to track treated stumps and avoid duplicate treatment.",
    },
    {
      method: "Flame weeding",
      timing: "Early summer, with a follow-up treatment in fall",
      herbicide: "",
      how_to: "Apply a directed propane-torch flame to the base/center stem of individual plants until it carbonizes and begins to glow; at least two applications are needed.",
      notes: "Experimental: has never exceeded ~40% mortality, compared with ~93% mortality for foliar-applied triclopyr (Ward et al. 2009, 2010). Use only when leaf litter is damp or during rain, with water on hand, due to fire risk — best reserved for ecologically sensitive sites where herbicide can't be used.",
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
      method: "Mechanical / hand-pull or dig",
      timing: "Any time the taproot can be reached",
      herbicide: "",
      how_to: "Pull, dig, or cut the taproot 1-2 inches below the soil surface with a sharp shovel or spade.",
      notes: "Effective for individual plants. If flowers are present, bag the material and dispose of it in a landfill to avoid spreading seed.",
    },
    {
      method: "Mowing",
      timing: "Just after flower-head emergence, before seeds enlarge",
      herbicide: "",
      how_to: "Mow as close to the ground as possible.",
      notes: "Plants may resprout and still flower but rarely produce viable seed. Monitor and repeat mowing if seed production is a concern; never mow when mature seed could already be present.",
    },
    {
      method: "Grazing",
      timing: "Before the bud stage, similar timing to hand-pulling",
      herbicide: "",
      how_to: "Graze with sheep, goats, or cattle; animals are more likely to eat the spiny plants if trained or if plants are treated with salt.",
      notes: "High-intensity, short-duration grazing for 2-3 years in grass-based pastures can reduce stem densities to low levels. Avoid overgrazing, which can suppress the vegetation you want competing with thistle.",
    },
    {
      method: "Biocontrol",
      timing: "Established populations, ongoing",
      herbicide: "",
      how_to: "Two insects, Puccinia carduorum and Rhinocyllus conicus, are established in parts of the Midwest and feed on musk thistle.",
      notes: "R. conicus has been found feeding on nearly 20 native thistle species — a nontarget risk to weigh. Check with your state department of agriculture for release permits.",
    },
    {
      method: "Foliar spray (novice)",
      timing: "Spring (rosette, bolting, or flowering) or fall (rosette, while leaves are still green)",
      herbicide: "2,4-D, broadcast 1-2 lb a.e./acre, or glyphosate 0.75-1.5 lb a.e./acre",
      how_to: "Broadcast or spot-spray; glyphosate is nonselective and will kill desirable plants it contacts.",
      notes: "Avoid drift onto desirable plants and open water.",
    },
    {
      method: "Foliar spray (professional)",
      timing: "Spring (rosette, bolting, or flowering) or fall (rosette, while leaves are still green)",
      herbicide: "Aminopyralid (Milestone) 3-5 fl oz/acre, clopyralid (Transline) 8-11 fl oz/acre, or picloram (Tordon K) 8-16 fl oz/acre",
      how_to: "Broadcast or spot-spray rosettes for best results.",
      notes: "Aminopyralid and picloram also carry over to control seedlings that germinate afterward, but both persist in soil for up to a year or more and should not be composted.",
    },
  ],
  "Leafy spurge": [
    {
      method: "Mechanical / hand-pull",
      timing: "Only for very small or first-year populations",
      herbicide: "",
      how_to: "Pull by hand, wearing gloves; the entire root must come out or the plant will resprout.",
      notes: "Older populations don't respond well to pulling — established taproots are very difficult to fully remove.",
    },
    {
      method: "Cultivation",
      timing: "Spring emergence through fall freeze, for 1-2 consecutive years without interruption",
      herbicide: "",
      how_to: "Cultivate 4 inches deep every 2-4 weeks starting 2-4 weeks after spring emergence and continuing until the ground freezes; or cultivate repeatedly each fall when regrowth reaches 3-6 inches, for 3 years.",
      notes: "Can eradicate populations if kept up without interruption, but risks spreading root fragments into previously uninfested ground.",
    },
    {
      method: "Mowing",
      timing: "Every 2-4 weeks through the growing season",
      herbicide: "",
      how_to: "Mow repeatedly at 2-4 week intervals; let regrowth stand 3-5 weeks before an herbicide application.",
      notes: "Suppresses populations and seed production and improves herbicide effectiveness by producing uniform regrowth, but does not eradicate on its own.",
    },
    {
      method: "Grazing",
      timing: "When bracts are present but before seed is produced",
      herbicide: "",
      how_to: "Graze with sheep or goats; isolate animals that have eaten mature seed until it has passed through their digestive system before moving them to new areas.",
      notes: "Combining grazing with a fall herbicide treatment is very effective — this combination typically takes 4-5 years to reach greater than 95% suppression.",
    },
    {
      method: "Biocontrol",
      timing: "Established populations, ongoing",
      herbicide: "",
      how_to: "Release Aphthona nigriscutis, A. lacertosa, or A. czwalinae — their root-boring larvae and foliage-feeding adults damage the plant.",
      notes: "Combined with grazing, this has reduced leafy spurge cover to 0% in 4-5 years in documented cases. Check with your state department of agriculture for release permits.",
    },
    {
      method: "Foliar spray",
      timing: "Late bud stage (bracts yellowing) and again in fall on regrowth before a killing frost",
      herbicide: "2,4-D 1-1.5 lb a.e./acre (twice yearly), or picloram (Tordon K) 32-64 fl oz/acre, or picloram+2,4-D (Tordon 101) 128 fl oz/acre, or imazapic (Plateau) 6-12 fl oz/acre applied in fall",
      how_to: "Broadcast or spot-spray; add methylated seed oil to imazapic per the product label.",
      notes: "2-4 years of repeated applications are typically needed depending on the product and rate chosen. Restricted-use picloram products require groundwater and surface-water precautions.",
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
