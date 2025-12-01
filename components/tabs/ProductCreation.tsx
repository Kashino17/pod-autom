
import React, { useState } from 'react';
import { ProductCreationConfig, PodNiche, PodPrompt, Shop } from '../../types';
import { Shirt, CheckSquare, Settings2, DollarSign, Box, Tag, Plus, X, Play, Palette, MessageSquare, Edit2, Save, Trash2, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Database, Loader2, Store, ExternalLink } from 'lucide-react';
import { useFastFashionResearchStatus, useFastFashionResearchCount } from '../../src/hooks/useFastFashionResearch';

interface ProductCreationProps {
  config: ProductCreationConfig;
  onChange: (newConfig: ProductCreationConfig) => void;
  shop: Shop;
}

const NICHE_CATEGORIES: Record<string, string[]> = {
  "1. Tiere": [
    "Haustiere – Hunde", "Haustiere – Katzen", "Haustiere – Kaninchen", "Haustiere – Vögel",
    "Wildtiere – Bären", "Wildtiere – Wölfe", "Meeressäuger – Delfine", "Nutztiere – Kühe",
    "Farmtiere – Schweine", "Reptilien – Eidechsen & Geckos", "Exotische Tiere – Alpaka & Lama", "Fantasietiere – Einhörner"
  ],
  "2. Hobbys & Lifestyle": [
    "Gaming – Retro-Spiele", "Gaming – E-Sport-Teams", "Outdoor – Wandern", "Outdoor – Camping",
    "Outdoor – Angeln", "Kreativ – Gärtnern & Urban-Jungle", "Kreativ – Fotografie",
    "Sportlich – Surfen / Wassersport", "Sportlich – Klettern", "Reisen – Städtereisen",
    "Reisen – Abenteuerreisen", "Yoga & Meditation"
  ],
  "3. Berufe": [
    "Medizin – Pflegekräfte", "Medizin – Ärztinnen & Ärzte", "Bildung – Lehrer", "Bildung – Erzieher",
    "IT & Technik – Programmierer", "Handwerk – Elektriker", "Handwerk – Schreiner",
    "Gastronomie – Köche", "Logistik – LKW-Fahrer", "Büro – Buchhalter", "Forschung – Wissenschaftler"
  ],
  "4. Humor & Memes": [
    "Lokale Sprüche – Deutsche Dialekte", "Lokale Sprüche – Bayrische Redensarten", "Ironische Alltagssätze",
    "Sarkastische Büro-Humor-Sprüche", "Retro-Memes (90er/00er)", "Popkultur-Anspielungen (Film & TV)",
    "Tier-Memes", "Food-Memes", "Nerd-Memes", "Fitness-Memes", "Alkohol-Humor"
  ],
  "5. Feiertage & besondere Anlässe": [
    "Oktoberfest", "Karneval/Fasching", "Weihnachten", "Ostern", "Halloween",
    "Muttertag & Vatertag", "Tag der Deutschen Einheit", "Ferienbeginn & Sommerfest",
    "Junggesell*innenabschied", "Firmen-Events & Team-Building", "Geburtstags-Motto-Shirts"
  ],
  "6. Nachhaltigkeit & Umwelt": [
    "Klimaschutz", "Zero-Waste", "Nachhaltiger Konsum", "Pflanzliche Ernährung / Veganismus",
    "Umweltsymbole", "Recycling & Upcycling", "Fair Fashion & Slow Fashion", "Naturschutz",
    "Elektrische Mobilität", "Energie sparen", "Meeresschutz"
  ],
  "7. Statement & Aktivismus": [
    "LGBTQ+", "Gleichberechtigung – Feminismus", "Antirassismus & Vielfalt", "Klimaprotest",
    "Tierschutz", "Frieden & Antikrieg", "Menschenrechte", "Anti-Mobbing / Mental-Health-Awareness",
    "Politische Satire (ohne urheberrechtlichen Schutz)", "Anti-Diskriminierung", "Soziale Gerechtigkeit & Armutsbekämpfung"
  ],
  "8. Retro & Nostalgie": [
    "Y2K-Designs", "90er-Ästhetik", "Vintage-Sportlogos", "Retro-Technik", "80er-Synthwave & Cyberpunk",
    "70er-Hippie-Motive", "60er-Pop-Art", "50er-Rockabilly-Stil", "Vintage-Comic-Art",
    "Retro-Computerspiele", "Nostalgische Autos"
  ],
  "9. Handgezeichnete & Minimalistische Kunst": [
    "Skizzen von Sportarten", "Linienstil-Tiere", "Aquarell-Pflanzen", "Abstrakte Gesichter",
    "Handlettering-Zitate", "Minimalistische Landschaften", "Skizzenhafte Stadt-Skylines",
    "Geometrische Muster", "Handschriftliche Kalligraphie", "Tinte-und-Feder-Illustrationen", "Mixed-Media-Collagen"
  ],
  "10. Gesundheit, Fitness & mentale Gesundheit": [
    "Fitness", "Yoga & Pilates", "Laufen & Marathon", "Crossfit-Motivationen", "Radfahren & Mountainbike",
    "Kampfsport & Boxen", "Triathlon & Multisport", "Mental Health Awareness", "Achtsamkeit & Meditation",
    "Selbstliebe & positive Mantras", "Gesundheit & Wellness"
  ],
  "11. Musik & Festivals": [
    "Festival-Designs", "Instrumente – Gitarre", "Instrumente – Klavier", "DJ-Kultur & EDM",
    "Hip-Hop & Rap", "Jazz & Blues", "Pop-Ikonen", "Bands (Motive für die keine Lizenz benötigt wird)",
    "Musikzitate & Song-Lyrics", "Musik-Memes", "Konzert-Fan-Merchandise"
  ],
  "12. Lesen & Bücher": [
    "Buchliebhaber-Humor", "Literarische Klassiker", "Fantasy & Sci-Fi-Motive", "Bücherregal-Skizzen",
    "Leselisten", "Schreibmaschinen-Ästhetik", "Autoren-Porträts", "Buchclub-Shirts",
    "Gedicht-Zeilen", "Bibliotheksliebhaber", "Lesen & Kaffee-Motive"
  ],
  "13. Food & Getränke": [
    "Bier-Humor", "Deutsche Küche", "Vegan & Superfoods", "Kaffee & Espresso", "Fast-Food-Puns",
    "Süßigkeiten", "BBQ & Grillen", "Wein & Cocktail-Designs", "Backen & Kuchen",
    "Sushi & asiatische Küche", "Regionales Food"
  ],
  "14. Lokale & regionale Bezüge (Deutschland)": [
    "Städte-Skylines", "Bundesländer-Wappen", "Dialekte", "Fußball-Mama/Papa", "Nordsee & Ostsee-Motive",
    "Alpen & Bergliebe", "Ruhrpott-Humor", "Berlin-\"Kiez\"-Kultur", "Schwarzwald & Kuckucksuhren",
    "Kirmes & Schützenfest", "Weihnachtsmärkte & Wintermärchen"
  ]
};

export const ProductCreation: React.FC<ProductCreationProps> = ({ config, onChange, shop }) => {
  const [activeTab, setActiveTab] = useState<'fast-fashion' | 'pod'>('fast-fashion');

  // Fast Fashion Research Status Hook - per Shop
  const { data: researchStatus, isLoading: statusLoading } = useFastFashionResearchStatus(shop?.id || null);
  const { data: productCount } = useFastFashionResearchCount(shop?.id || null);

  const update = (key: keyof ProductCreationConfig, value: any) => {
    onChange({ ...config, [key]: value });
  };

  // --- POD Helpers ---
  const updatePod = (updates: Partial<typeof config.podSettings>) => {
    onChange({
      ...config,
      podSettings: { ...config.podSettings, ...updates }
    });
  };

  const addNiche = () => {
    const newNiche: PodNiche = {
      id: Math.random().toString(36).substr(2, 9),
      category: Object.keys(NICHE_CATEGORIES)[0],
      subCategory: NICHE_CATEGORIES[Object.keys(NICHE_CATEGORIES)[0]][0]
    };
    updatePod({ niches: [...config.podSettings.niches, newNiche] });
  };

  const updateNiche = (id: string, field: keyof PodNiche, value: string) => {
    const newNiches = config.podSettings.niches.map(n => {
      if (n.id !== id) return n;
      
      if (field === 'category') {
        // Reset subcategory when category changes
        return { 
          ...n, 
          category: value, 
          subCategory: NICHE_CATEGORIES[value][0] 
        };
      }
      return { ...n, [field]: value };
    });
    updatePod({ niches: newNiches });
  };

  const removeNiche = (id: string) => {
    updatePod({ niches: config.podSettings.niches.filter(n => n.id !== id) });
  };

  const addPrompt = () => {
    const newPrompt: PodPrompt = {
      id: Math.random().toString(36).substr(2, 9),
      title: '',
      content: '',
      isEditing: true // Automatically start in edit mode
    };
    updatePod({ prompts: [...config.podSettings.prompts, newPrompt] });
  };

  const updatePrompt = (id: string, field: keyof PodPrompt, value: any) => {
    updatePod({ 
      prompts: config.podSettings.prompts.map(p => p.id === id ? { ...p, [field]: value } : p) 
    });
  };

  const removePrompt = (id: string) => {
    updatePod({ prompts: config.podSettings.prompts.filter(p => p.id !== id) });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Header */}
      <div className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 backdrop-blur-sm">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-zinc-100/5 rounded-lg border border-zinc-100/10">
                 <Shirt className="w-5 h-5 text-zinc-400" />
              </div>
              <h1 className="text-2xl font-bold text-white">Product Creation</h1>
           </div>
           <p className="text-zinc-400 text-sm max-w-xl">
             Manage creation strategies for Fast Fashion and Print on Demand products.
           </p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex justify-center">
         <div className="bg-zinc-900 p-1 rounded-xl border border-zinc-800 flex gap-1">
            <button 
               onClick={() => setActiveTab('fast-fashion')}
               className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'fast-fashion' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
               Fast Fashion Creation
            </button>
            <button 
               onClick={() => setActiveTab('pod')}
               className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'pod' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
               POD T-Shirt Creation
            </button>
         </div>
      </div>

      {/* ================= FAST FASHION TAB ================= */}
      {activeTab === 'fast-fashion' && (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2">

          {/* Fast Fashion Research Table Status Info */}
          {statusLoading ? (
            <div className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl">
              <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
              <span className="text-sm text-zinc-400">Prüfe Research Tabelle...</span>
            </div>
          ) : researchStatus?.is_initialized ? (
            <div className="flex items-center gap-3 p-3 bg-zinc-900/30 border border-zinc-800 rounded-xl">
              <div className="p-1 bg-emerald-500/20 rounded">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="flex-1 flex items-center gap-3">
                <span className="text-xs text-zinc-400">Research Tabelle:</span>
                <code className="text-xs text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-800/50">
                  {researchStatus.table_name}
                </code>
                <span className="text-xs text-zinc-500">|</span>
                <span className="text-xs text-zinc-400">{productCount?.count ?? 0} Produkte</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Store className="w-3 h-3" />
                {shop?.name || shop?.domain}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-amber-950/20 border border-amber-800/30 rounded-xl">
              <div className="p-1 bg-amber-500/20 rounded">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="flex-1">
                <span className="text-xs text-amber-300">Research Tabelle nicht vorhanden - </span>
                <span className="text-xs text-amber-400/70">Gehe zu General Settings um sie zu erstellen</span>
              </div>
              <a
                href="#general"
                className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
              >
                Settings
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Global Template Selection */}
          <div className="flex items-center gap-4 p-4 bg-zinc-900/30 border border-zinc-800 rounded-xl">
             <label className="text-sm font-medium text-zinc-300 whitespace-nowrap">Sales Text & Title Template:</label>
             <select 
               value={config.salesTextTemplate}
               onChange={(e) => update('salesTextTemplate', e.target.value)}
               className="bg-zinc-950 border border-zinc-700 text-white text-sm rounded-lg focus:ring-primary focus:border-primary block w-64 p-2.5"
             >
               <option value="Winter">Winter</option>
               <option value="Frühling">Frühling</option>
               <option value="Sommer">Sommer</option>
               <option value="Herbst">Herbst</option>
             </select>
          </div>

          {/* 1. Grundlegende Optimierungen */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
             <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-900/30 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-zinc-500" />
                <h3 className="font-semibold text-zinc-200 text-sm">Grundlegende Optimierungen</h3>
             </div>
             <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-900/50 transition-colors cursor-pointer border border-transparent hover:border-zinc-800">
                   <input 
                     type="checkbox" 
                     checked={config.generateOptimizedTitle}
                     onChange={(e) => update('generateOptimizedTitle', e.target.checked)}
                     className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500/20"
                   />
                   <span className="text-sm text-zinc-300">Optimierten Produkttitel generieren</span>
                </label>
                
                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-900/50 transition-colors cursor-pointer border border-transparent hover:border-zinc-800">
                   <input 
                     type="checkbox" 
                     checked={config.generateOptimizedDescription}
                   onChange={(e) => update('generateOptimizedDescription', e.target.checked)}
                     className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500/20"
                   />
                   <span className="text-sm text-zinc-300">Verbesserte Produktbeschreibung generieren</span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-900/50 transition-colors cursor-pointer border border-transparent hover:border-zinc-800">
                   <input 
                     type="checkbox" 
                     checked={config.generateTags}
                     onChange={(e) => update('generateTags', e.target.checked)}
                     className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500/20"
                   />
                   <span className="text-sm text-zinc-300">Produkt Tags generieren und setzen</span>
                </label>
             </div>
          </div>

          {/* 2. Variantenoptimierungen */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
             <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-900/30 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-zinc-500" />
                <h3 className="font-semibold text-zinc-200 text-sm">Variantenoptimierungen</h3>
             </div>
             <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-900/50 transition-colors cursor-pointer border border-transparent hover:border-zinc-800">
                   <input 
                     type="checkbox" 
                     checked={config.translateSize}
                     onChange={(e) => update('translateSize', e.target.checked)}
                     className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500/20"
                   />
                   <span className="text-sm text-zinc-300">Size zu "Größe" ändern</span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-900/50 transition-colors cursor-pointer border border-transparent hover:border-zinc-800">
                   <input 
                     type="checkbox" 
                     checked={config.setGermanSizes}
                     onChange={(e) => update('setGermanSizes', e.target.checked)}
                     className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500/20"
                   />
                   <span className="text-sm text-zinc-300">Deutsche Größen setzen</span>
                </label>
             </div>
          </div>

          {/* 3. Preisoptimierungen */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
             <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-900/30 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-zinc-500" />
                <h3 className="font-semibold text-zinc-200 text-sm">Preisoptimierungen</h3>
             </div>
             <div className="p-6 space-y-4">
                
                {/* Row 1: Compare At Price */}
                <div className="flex items-center gap-4">
                   <div className="flex-1">
                      <label className="flex items-center gap-3 cursor-pointer">
                         <input 
                           type="checkbox" 
                           checked={config.setCompareAtPrice}
                           onChange={(e) => update('setCompareAtPrice', e.target.checked)}
                           className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500/20"
                         />
                         <span className="text-sm text-zinc-300">Vergleichspreis setzen</span>
                      </label>
                   </div>
                   <div className="flex items-center gap-2 w-48">
                      <span className="text-xs text-zinc-500">Prozent:</span>
                      <div className="relative flex-1">
                         <input 
                           type="number" 
                           disabled={!config.setCompareAtPrice}
                           value={config.compareAtPricePercent}
                           onChange={(e) => update('compareAtPricePercent', parseFloat(e.target.value))}
                           className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-sm text-white disabled:opacity-30 disabled:cursor-not-allowed focus:border-indigo-500 outline-none transition-opacity"
                         />
                         <span className="absolute right-2 top-1.5 text-xs text-zinc-500">%</span>
                      </div>
                   </div>
                </div>

                {/* Row 2: Decimals */}
                <div className="flex items-center gap-4">
                   <div className="flex-1">
                      <label className="flex items-center gap-3 cursor-pointer">
                         <input 
                           type="checkbox" 
                           checked={config.setPriceDecimals}
                           onChange={(e) => update('setPriceDecimals', e.target.checked)}
                           className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500/20"
                         />
                         <span className="text-sm text-zinc-300">Preisdezimalen setzen</span>
                      </label>
                   </div>
                   <div className="flex items-center gap-2 w-48">
                      <span className="text-xs text-zinc-500">Nachkommastellen:</span>
                      <div className="flex-1">
                         <input 
                           type="number" 
                           disabled={!config.setPriceDecimals}
                           value={config.priceDecimalsValue}
                           onChange={(e) => update('priceDecimalsValue', parseInt(e.target.value))}
                           className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-sm text-white disabled:opacity-30 disabled:cursor-not-allowed focus:border-indigo-500 outline-none transition-opacity"
                         />
                      </div>
                   </div>
                </div>

                {/* Row 3: Compare Decimals */}
                <div className="flex items-center gap-4">
                   <div className="flex-1">
                      <label className="flex items-center gap-3 cursor-pointer">
                         <input 
                           type="checkbox" 
                           checked={config.setCompareAtPriceDecimals}
                           onChange={(e) => update('setCompareAtPriceDecimals', e.target.checked)}
                           className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500/20"
                         />
                         <span className="text-sm text-zinc-300">Vergleichspreis-Dezimalen setzen</span>
                      </label>
                   </div>
                   <div className="flex items-center gap-2 w-48">
                      <span className="text-xs text-zinc-500">Nachkommastellen:</span>
                      <div className="flex-1">
                         <input 
                           type="number" 
                           disabled={!config.setCompareAtPriceDecimals}
                           value={config.compareAtPriceDecimalsValue}
                           onChange={(e) => update('compareAtPriceDecimalsValue', parseInt(e.target.value))}
                           className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-sm text-white disabled:opacity-30 disabled:cursor-not-allowed focus:border-indigo-500 outline-none transition-opacity"
                         />
                      </div>
                   </div>
                </div>

                {/* Row 4: Adjustment */}
                <div className="flex items-center gap-4 pt-2 border-t border-zinc-800/50 mt-2">
                   <div className="flex-1">
                      <label className="flex items-center gap-3 cursor-pointer">
                         <input 
                           type="checkbox" 
                           checked={config.adjustProductPrice}
                           onChange={(e) => update('adjustProductPrice', e.target.checked)}
                           className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500/20"
                         />
                         <span className="text-sm text-zinc-300">Produktpreis anpassen</span>
                      </label>
                   </div>
                   
                   <div className="flex items-center gap-3">
                      <select 
                         disabled={!config.adjustProductPrice}
                         value={config.priceAdjustmentType}
                         onChange={(e) => update('priceAdjustmentType', e.target.value)}
                         className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-white disabled:opacity-30 focus:border-indigo-500 outline-none"
                      >
                         <option value="PERCENT">Prozent</option>
                         <option value="FIXED">Wert</option>
                      </select>

                      <div className="flex items-center gap-2 w-24">
                         <span className="text-xs text-zinc-500">Wert:</span>
                         <input 
                           type="number" 
                           disabled={!config.adjustProductPrice}
                           value={config.priceAdjustmentValue}
                           onChange={(e) => update('priceAdjustmentValue', parseFloat(e.target.value))}
                           className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-sm text-white disabled:opacity-30 disabled:cursor-not-allowed focus:border-indigo-500 outline-none"
                         />
                      </div>

                      {/* Dynamic Reduction Hint */}
                      {config.adjustProductPrice && config.priceAdjustmentValue < 0 && (
                          <span className="text-xs text-red-400 font-medium px-2 py-0.5 rounded bg-red-400/10 border border-red-400/20 ml-2 animate-in fade-in">
                             Reduzierung
                          </span>
                      )}
                   </div>
                </div>

             </div>
          </div>

          {/* 4. Bestandsoptimierungen */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
             <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-900/30 flex items-center gap-2">
                <Box className="w-4 h-4 text-zinc-500" />
                <h3 className="font-semibold text-zinc-200 text-sm">Bestandsoptimierungen</h3>
             </div>
             <div className="p-6 grid grid-cols-1 gap-4">
                
                <div className="flex items-center gap-4">
                   <div className="w-48">
                      <label className="flex items-center gap-3 cursor-pointer">
                         <input 
                           type="checkbox" 
                           checked={config.setGlobalInventory}
                           onChange={(e) => update('setGlobalInventory', e.target.checked)}
                           className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500/20"
                         />
                         <span className="text-sm text-zinc-300">Globale Menge setzen</span>
                      </label>
                   </div>
                   <div className="w-32">
                      <input 
                        type="number" 
                        disabled={!config.setGlobalInventory}
                        value={config.globalInventoryValue}
                        onChange={(e) => update('globalInventoryValue', parseInt(e.target.value))}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-sm text-white disabled:opacity-30 disabled:cursor-not-allowed focus:border-indigo-500 outline-none transition-opacity font-mono"
                      />
                   </div>
                   <div className="flex-1 flex gap-6 ml-4">
                       <label className="flex items-center gap-3 cursor-pointer">
                         <input 
                           type="checkbox" 
                           checked={config.enableInventoryTracking}
                           onChange={(e) => update('enableInventoryTracking', e.target.checked)}
                           className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500/20"
                         />
                         <span className="text-sm text-zinc-300">Bestandsverfolgung aktivieren</span>
                      </label>
                   </div>
                </div>

                <div className="pt-2">
                   <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={config.publishChannels}
                        onChange={(e) => update('publishChannels', e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500/20"
                      />
                      <span className="text-sm text-zinc-300">In allen Vertriebskanälen veröffentlichen</span>
                   </label>
                </div>

             </div>
          </div>

          {/* 5. Zusätzliche Optionen */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
             <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-900/30 flex items-center gap-2">
                <Tag className="w-4 h-4 text-zinc-500" />
                <h3 className="font-semibold text-zinc-200 text-sm">Zusätzliche Optionen</h3>
             </div>
             <div className="p-6 space-y-4">
                
                <div className="flex items-start gap-4">
                   <div className="w-48 pt-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                         <input 
                           type="checkbox" 
                           checked={config.setGlobalTags}
                           onChange={(e) => update('setGlobalTags', e.target.checked)}
                           className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500/20"
                         />
                         <span className="text-sm text-zinc-300">Globale Tags setzen</span>
                      </label>
                   </div>
                   <div className="flex-1">
                      <input 
                         type="text"
                         disabled={!config.setGlobalTags}
                         value={config.globalTagsValue}
                         onChange={(e) => update('globalTagsValue', e.target.value)}
                         placeholder="tag1, tag2, tag3"
                         className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white disabled:opacity-30 disabled:cursor-not-allowed focus:border-indigo-500 outline-none" 
                      />
                   </div>
                </div>

                <div className="flex items-center gap-4">
                   <div className="w-48">
                      <label className="flex items-center gap-3 cursor-pointer">
                         <input 
                           type="checkbox" 
                           checked={config.changeProductStatus}
                           onChange={(e) => update('changeProductStatus', e.target.checked)}
                           className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500/20"
                         />
                         <span className="text-sm text-zinc-300">Produktstatus ändern</span>
                      </label>
                   </div>
                   <div className="w-40">
                      <select 
                         disabled={!config.changeProductStatus}
                         value={config.productStatusValue}
                         onChange={(e) => update('productStatusValue', e.target.value as any)}
                         className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-sm text-white disabled:opacity-30 disabled:cursor-not-allowed focus:border-indigo-500 outline-none"
                      >
                         <option value="active">Active</option>
                         <option value="draft">Draft</option>
                         <option value="archived">Archived</option>
                      </select>
                   </div>
                   <span className="text-xs text-zinc-500">Status</span>
                </div>

                <div className="pt-2">
                   <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={config.setCategoryTagFashion}
                        onChange={(e) => update('setCategoryTagFashion', e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500/20"
                      />
                      <span className="text-sm text-zinc-300">Kategorie-Tag Fashion setzen</span>
                   </label>
                </div>

             </div>
          </div>
        </div>
      )}

      {/* ================= POD T-SHIRT TAB ================= */}
      {activeTab === 'pod' && (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2">
          
          {/* Removed Activation Checkbox as requested */}

          {/* Nischen Auswahl */}
          <div className="space-y-4">
             <label className="text-sm text-zinc-400 font-medium">Nischen Auswahl</label>
             <div className="border-t border-zinc-800 my-2"></div>

             <button 
                onClick={addNiche}
                className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
             >
                <Plus className="w-4 h-4" />
                Neue Nische hinzufügen
             </button>

             <div className="space-y-3 mt-4">
                {config.podSettings.niches.map((niche, idx) => (
                   <div key={niche.id} className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
                      <div className="flex items-center gap-3 w-32 shrink-0">
                         <span className="text-sm text-zinc-400">Nische {idx + 1}</span>
                         <button 
                            onClick={() => removeNiche(niche.id)}
                            className="bg-zinc-800 hover:bg-zinc-700 p-1 rounded text-zinc-400 hover:text-white transition-colors"
                         >
                            <X className="w-3 h-3" />
                         </button>
                      </div>

                      <div className="flex-1 grid grid-cols-2 gap-4">
                         <select 
                            value={niche.category}
                            onChange={(e) => updateNiche(niche.id, 'category', e.target.value)}
                            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                         >
                            {Object.keys(NICHE_CATEGORIES).map(cat => (
                               <option key={cat} value={cat}>{cat}</option>
                            ))}
                         </select>

                         <select 
                            value={niche.subCategory}
                            onChange={(e) => updateNiche(niche.id, 'subCategory', e.target.value)}
                            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                         >
                            {NICHE_CATEGORIES[niche.category].map(sub => (
                               <option key={sub} value={sub}>{sub}</option>
                            ))}
                         </select>
                      </div>
                   </div>
                ))}
                {config.podSettings.niches.length === 0 && (
                   <div className="text-center py-8 text-zinc-500 text-sm italic border border-dashed border-zinc-800 rounded-xl">
                      Keine Nischen konfiguriert
                   </div>
                )}
             </div>
          </div>

          {/* ChatGPT Prompts */}
          <div className="space-y-4 pt-4">
             <label className="text-sm text-zinc-400 font-medium">ChatGPT Prompts</label>
             <div className="border-t border-zinc-800 my-2"></div>

             <button 
                onClick={addPrompt}
                className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
             >
                <Plus className="w-4 h-4" />
                Neuen Prompt hinzufügen
             </button>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {config.podSettings.prompts.map((prompt, idx) => {
                   const isEditing = prompt.isEditing;

                   if (isEditing) {
                     // Expanded Edit Mode
                     return (
                        <div key={prompt.id} className="col-span-1 md:col-span-2 lg:col-span-3 bg-zinc-900/50 border border-zinc-700 rounded-xl overflow-hidden shadow-xl animate-in fade-in zoom-in-95">
                           <div className="flex items-center gap-3 p-4 bg-zinc-900/80 border-b border-zinc-800/50">
                              <div className="w-8 h-8 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                                 <Edit2 className="w-4 h-4 text-indigo-400" />
                              </div>
                              <input 
                                 type="text"
                                 value={prompt.title}
                                 onChange={(e) => updatePrompt(prompt.id, 'title', e.target.value)}
                                 placeholder={`Prompt Title ${idx + 1}`}
                                 className="bg-transparent border-none text-white font-medium focus:ring-0 p-0 w-full placeholder:text-zinc-600"
                                 autoFocus
                              />
                              <button 
                                 onClick={() => updatePrompt(prompt.id, 'isEditing', false)}
                                 className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium transition-colors border border-emerald-500/20"
                              >
                                 <Save className="w-3.5 h-3.5" />
                                 Save
                              </button>
                           </div>
                           <div className="p-4 bg-zinc-950/30">
                              <div className="flex gap-3">
                                  <MessageSquare className="w-4 h-4 text-zinc-600 mt-2 shrink-0" />
                                  <textarea 
                                     value={prompt.content}
                                     onChange={(e) => updatePrompt(prompt.id, 'content', e.target.value)}
                                     placeholder="Geben Sie hier den Prompt-Inhalt ein..."
                                     className="w-full bg-transparent text-sm text-zinc-300 placeholder:text-zinc-700 focus:outline-none resize-y min-h-[120px]"
                                  />
                              </div>
                              <div className="flex justify-end pt-2">
                                 <button 
                                    onClick={() => removePrompt(prompt.id)}
                                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"
                                 >
                                    <Trash2 className="w-3 h-3" /> Delete Prompt
                                 </button>
                              </div>
                           </div>
                        </div>
                     );
                   }

                   // Compact View Mode
                   return (
                      <div key={prompt.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col group hover:border-zinc-700 transition-colors">
                         <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                               <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center">
                                  <Play className="w-3 h-3 text-zinc-500" />
                               </div>
                               <span className="text-sm font-medium text-white truncate max-w-[140px]">
                                  {prompt.title || `Prompt #${idx + 1}`}
                               </span>
                            </div>
                            <button 
                               onClick={() => updatePrompt(prompt.id, 'isEditing', true)}
                               className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
                            >
                               <Edit2 className="w-3.5 h-3.5" />
                            </button>
                         </div>
                         <div className="flex-1 bg-zinc-950/50 rounded-lg p-2.5 mb-3 border border-zinc-800/50">
                            <p className="text-xs text-zinc-500 line-clamp-3">
                               {prompt.content || "No content provided..."}
                            </p>
                         </div>
                         <div className="flex items-center justify-between text-[10px] text-zinc-600 pt-1">
                            <span>ID: {prompt.id.substr(0,4)}</span>
                         </div>
                      </div>
                   );
                })}
             </div>
          </div>

          {/* GPT Image Quality */}
          <div className="space-y-4 pt-4 pb-12">
             <label className="text-sm text-zinc-400 font-medium">GPT Image Quality</label>
             <div className="border-t border-zinc-800 my-2"></div>
             
             <div className="flex items-center gap-4">
                <span className="text-sm text-zinc-300">Qualität auswählen:</span>
                <div className="relative w-48">
                   <select 
                      value={config.podSettings.imageQuality}
                      onChange={(e) => updatePod({ imageQuality: e.target.value as any })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2 pl-3 pr-8 text-sm text-white focus:outline-none focus:border-zinc-500 appearance-none"
                   >
                      <option value="HIGH">HIGH</option>
                      <option value="STANDARD">STANDARD</option>
                      <option value="LOW">LOW</option>
                   </select>
                   <Palette className="absolute right-3 top-2.5 w-4 h-4 text-zinc-500 pointer-events-none" />
                </div>
             </div>
          </div>

        </div>
      )}

    </div>
  );
};
