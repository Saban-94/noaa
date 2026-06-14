import React from 'react';

/**
 * Highlights matches within a text string.
 * Returns an array of React elements (strings or spans).
 */
export function highlightText(text: string, highlight: string) {
  if (!highlight.trim()) {
    return text;
  }
  
  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, i) => 
    regex.test(part) ? (
      <span key={i} className="bg-sky-100 text-sky-900 font-bold px-0.5 rounded">
        {part}
      </span>
    ) : (
      part
    )
  );
}

export interface ParsedItem {
  quantity: string;
  name: string;
  sku: string;
  matchedName?: string; // Standardized name from catalog
}

export interface CatalogProduct {
  sku: string;
  name: string;
  keywords: string[]; // Hebrew synonyms or aliases
  category: string;
}

export const INVENTORY_CATALOG: CatalogProduct[] = [
  // חומרי מחצבה, סומסום וחול
  { sku: '11501', name: 'חול בניין סקי', keywords: ['חול', 'דיונות', 'חול בניין', 'חול סקי', 'חולסקי', 'בלק חול'], category: 'חומרי מחצבה' },
  { sku: '11502', name: 'חול טיח מנופה', keywords: ['חול טיח', 'חול מנופה', 'מנופה', 'טיח מנופה'], category: 'חומרי מחצבה' },
  { sku: '11503', name: 'חול זיז', keywords: ['זיז', 'חול זיז', 'זיזים'], category: 'חומרי מחצבה' },
  { sku: '11701', name: 'סומסום רטוב נקי מחצבה', keywords: ['שומשום', 'סומסום', 'שומשום רטוב', 'סומסום נקי', 'שומשום רטוב', 'בלק שומשום', 'בלק סומסום'], category: 'חומרי מחצבה' },
  { sku: '11702', name: 'חצץ פיין (עדש)', keywords: ['חצץ', 'עדש', 'חצץ פיין', 'פוליה', 'חצץ עדש'], category: 'חומרי מחצבה' },
  { sku: '11703', name: 'טיט מוכן לריצוף', keywords: ['טיט', 'טיט מוכן', 'שק טיט'], category: 'חומרי מחצבה' },

  // מלט וסיד
  { sku: '11601', name: 'מלט פורטלנד שחור (נשר)', keywords: ['מלט', 'מלט שחור', 'מלט נשר', 'שק מלט', 'צמנט', 'מלטשחור'], category: 'מלט וסיד' },
  { sku: '11602', name: 'מלט לבן שק', keywords: ['מלט לבן', 'צמנט לבן', 'מלטלבן'], category: 'מלט וסיד' },
  { sku: '12201', name: 'סיד כבוי שק', keywords: ['סיד', 'סיד כבוי', 'שק סיד', 'סידכבוי'], category: 'מלט וסיד' },
  { sku: '12202', name: 'אבקת גיר שק', keywords: ['גיר', 'אבקת גיר', 'שק גיר'], category: 'מלט וסיד' },

  // בלוקים ואיטונג
  { sku: '12001', name: 'בלוק בטון 10 (אפור)', keywords: ['בלוק 10', 'בלוקים 10', 'בלוק בטון 10', 'בלוקי 10', 'בטון 10'], category: 'בלוקים' },
  { sku: '12002', name: 'בלוק בטון 20 (אפור)', keywords: ['בלוק 20', 'בלוקים 20', 'בלוק בטון 20', 'בלוקי 20', 'בטון 20'], category: 'בלוקים' },
  { sku: '12003', name: 'בלוק בטון 15 (אפור)', keywords: ['בלוק 15', 'בלוקים 15', 'בלוק בטון 15', 'בלוקי 15', 'בטון 15'], category: 'בלוקים' },
  { sku: '12501', name: 'בלוק איטונג מקורי 10', keywords: ['איטונג 10', 'בלוק איטונג 10', 'איטונג', 'איטונג10'], category: 'בלוקים' },
  { sku: '12502', name: 'בלוק איטונג מקורי 20', keywords: ['איטונג 20', 'בלוק איטונג 20', 'איטונג20'], category: 'בלוקים' },
  { sku: '12005', name: 'בלוק תעלה 20', keywords: ['בלוק תעלה', 'בלוקי תעלה', 'תעלה 20', 'תעלה20'], category: 'בלוקים' },

  // דבקים וטיח
  { sku: '11901', name: 'דבק קרמיקה 109 תרמוקיר', keywords: ['דבק 109', '109', 'דבק קרמיקה', 'תרמוקיר 109', 'דבק109'], category: 'דבקים וטיח' },
  { sku: '11902', name: 'דבק קרמיקה מהיר 115', keywords: ['דבק 115', '115', 'דבק מהיר', 'תרמוקיר 115', 'דבק115'], category: 'דבקים וטיח' },
  { sku: '11903', name: 'דבק שיש 120 מקצועי', keywords: ['דבק שיש', 'דבק 120', '120', 'דבק120'], category: 'דבקים וטיח' },
  { sku: '12101', name: 'טיח חוץ תרמי 710', keywords: ['טיח חוץ', '710', 'טיח תרמי', 'תרמוקיר 710', 'טיח710'], category: 'דבקים וטיח' },
  { sku: '12102', name: 'טיח פנים הרבצה 720', keywords: ['טיח פנים', 'הרבצה', '720', 'טיח הרבצה', 'תרמוקיר 720', 'טיח720'], category: 'דבקים וטיח' },
  { sku: '11905', name: 'דבק רב תכליתי גילר', keywords: ['גילר', 'דבק גילר', 'דבקגילר'], category: 'דבקים וטיח' },

  // גבס ובידוד
  { sku: '11801', name: 'לוח גבס לבן רגיל 1.2*2.0', keywords: ['גבס לבן', 'לוח גבס', 'לוח גבס רגיל', 'לוחות גבס', 'גבסלבן'], category: 'גבס ובידוד' },
  { sku: '11802', name: 'לוח גבס ירוק עמיד מים 1.2*2.0', keywords: ['גבס ירוק', 'גבס עמיד מים', 'לוח ירוק', 'גבסירוק'], category: 'גבס ובידוד' },
  { sku: '11803', name: 'לוח גבס אדום עמיד אש 1.2*2.0', keywords: ['גבס אדום', 'גבס עמיד אש', 'לוח אדום', 'גבסאדום'], category: 'גבס ובידוד' },
  { sku: '11810', name: 'קלקר בידוד קשיח פוליסטירן F20', keywords: ['בידוד', 'קלקר', 'לוח קלקר', 'פוליסטירן', 'קלקלים'], category: 'גבס ובידוד' },
  { sku: '11811', name: 'צמר זכוכית לבידוד גליל', keywords: ['צמר זכוכית', 'צמר סלעים', 'בידוד גליל', 'צמרזכוכית'], category: 'גבס ובידוד' },
  { sku: '11820', name: 'פרופיל גבס מסלול 50', keywords: ['מסלול 50', 'פרופיל מסלול', 'פרופיל גבס', 'מסלול50'], category: 'גבס ובידוד' },
  { sku: '11821', name: 'פרופיל גבס ניצב 50', keywords: ['ניצב 50', 'פרופיל ניצב', 'ניצב גבס', 'ניצב50'], category: 'גבס ובידוד' },

  // ברזל ואביזרים
  { sku: '12301', name: 'רשת ברזל בניין 8 מ"מ', keywords: ['רשת ברזל', 'רשת בניין', 'ברזל 8', 'ברזל בניין', 'רשתות ברזל'], category: 'ברזל בניין' },
  { sku: '12302', name: 'מוט ברזל בניין קוטר 10', keywords: ['מוט ברזל', 'ברזל 10', 'מוט 10', 'מוטות ברזל'], category: 'ברזל בניין' },
  { sku: '12305', name: 'חוט קשירה שחור לברזלן', keywords: ['חוט קשירה', 'חוט שחור', 'קשירה', 'סליל חוט שחור'], category: 'ברזל בניין' },

  // איטום וצבע
  { sku: '12801', name: 'חומר איטום סיקה פלקס 11FC', keywords: ['סיקה', 'סיקפלקס', 'סיקה פלקס', '11FC', 'sikaflex', 'דבק סיקה'], category: 'איטום וצבע' },
  { sku: '12802', name: 'סיקה טופ 107 איטום דו רכיבי', keywords: ['סיקה 107', 'sikatop', 'איטום סיקה', 'סיקה107'], category: 'איטום וצבע' },
  { sku: '12803', name: 'מסטיק איטום ביטומני פלסטוגום', keywords: ['ביטומני', 'פלסטוגום', 'מסטיק איטום'], category: 'איטום וצבע' }
];

/**
 * Intelligent substring and word-synonym matcher against the inventory catalog.
 */
export function findCatalogProduct(name: string, explicitSku?: string): CatalogProduct | null {
  if (explicitSku) {
    const found = INVENTORY_CATALOG.find(p => p.sku === explicitSku);
    if (found) return found;
  }
  
  const cleanName = name.trim().toLowerCase();
  if (!cleanName) return null;

  // Stop-word and formatting removal
  const cleanWords = cleanName
    .replace(/[|,\-():+]/g, ' ') // replace punctuation/symbols with spaces
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => {
      const stopWords = ['כמות', 'יחידות', 'יח', 'שקים', 'שק', 'קוב', 'באלות', 'באלה', 'בפלטה', 'פלטות', 'מטר', 'מ"ר', 'טון', 'דלי', 'כללי', 'סך', 'הכול', 'עם'];
      return w && !stopWords.includes(w) && isNaN(Number(w));
    });

  if (cleanWords.length === 0) return null;

  let bestMatch: CatalogProduct | null = null;
  let highestScore = 0;

  for (const product of INVENTORY_CATALOG) {
    let score = 0;

    // 1. Exact name match (highest priority score)
    const productCleanName = product.name.toLowerCase();
    if (productCleanName === cleanName) {
      score += 200;
    }

    // 2. Keyword matching weights
    for (const keyword of product.keywords) {
      const kwLower = keyword.toLowerCase();
      if (kwLower === cleanName) {
        score += 150;
      } else if (cleanName === kwLower || cleanName.includes(kwLower)) {
        score += 80;
      }
    }

    // 3. Word token boundary check (Intersection of words)
    let matchedWordsCount = 0;
    const allProdMatches = [productCleanName, ...product.keywords.map(k => k.toLowerCase())];
    
    for (const searchWord of cleanWords) {
      const hasMatch = allProdMatches.some(str => 
        str === searchWord || 
        str.includes(searchWord) || 
        searchWord.includes(str)
      );
      if (hasMatch) {
        matchedWordsCount++;
      }
    }

    if (matchedWordsCount > 0) {
      score += (matchedWordsCount / cleanWords.length) * 50;
      score += matchedWordsCount * 15;
    }

    // Update if this is the strongest candidate
    if (score > highestScore) {
      highestScore = score;
      bestMatch = product;
    }
  }

  // Minimum score threshold of 25 is required to match high-quality catalog entries
  return highestScore >= 25 ? bestMatch : null;
}

/**
 * Parses a raw string of items into structured objects.
 * Pattern: [Quantity] [Name] [SKU (exactly 5 digits)]
 * Extremely robust free-text extraction.
 */
export function parseItems(text: string): ParsedItem[] {
  if (!text) return [];
  
  const items: ParsedItem[] = [];
  
  // Split by lines first to ensure each line is handled individually
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  for (const line of lines) {
    let currentLine = line.trim();
    if (!currentLine) continue;

    // 1. Identify and extract 5-digit SKU if present anywhere in the line
    let sku = '';
    const skuMatch = currentLine.match(/\b(\d{5})\b/);
    if (skuMatch) {
      sku = skuMatch[1];
      // strip SKU and extra divider symbols surrounding it
      currentLine = currentLine.replace(sku, '').trim();
    }

    // Clean delimiters like |, -, :, ()
    currentLine = currentLine.replace(/^[|\-:\s]+|[|\-:\s]+$/g, '').trim();

    // 2. Extract Quantity
    let quantity = '1';
    
    // Check start of string for number (e.g., "8 חול", "4.5 טיח", "7-מלט")
    const leadingQtyMatch = currentLine.match(/^(\d+(?:\.\d+)?)\s*(?:[|\-xX*:]|שקים|שק|קוב|יחידות|יח|באלות|באלה)?\s*(.+)$/i);
    // Check end of string for quantity (e.g. "מלט 5", "שק חול כמות 3")
    const trailingQtyMatch = currentLine.match(/^(.+?)\s*(?:כמות|כפול|x|X|\*|-)?\s*(\d+(?:\.\d+)?)\s*(?:שקים|שק|קוב|יחידות|יח|באלות|באלה|\s*$)/);
    
    let rawName = currentLine;
    
    if (leadingQtyMatch) {
      quantity = leadingQtyMatch[1];
      rawName = leadingQtyMatch[2].trim();
    } else if (trailingQtyMatch) {
      quantity = trailingQtyMatch[2];
      rawName = trailingQtyMatch[1].trim();
    }

    // Final clean of the item name
    let cleanName = rawName
      .replace(/^[|\-:\s,()]+|[|\-:\s,()]+$/g, '') // remove leading/trailing separators
      .trim();

    // If name ended with some garbage leftovers from quantites, clean them
    cleanName = cleanName.replace(/\s+(?:כמות|יח|יחידות|שק|שקים|טון|קוב)\s*$/i, '').trim();

    if (!cleanName) continue;

    // 3. Match against dynamic inventory catalog to predict SKU or standardized name
    const matchesCatalog = findCatalogProduct(cleanName, sku);
    
    if (matchesCatalog) {
      items.push({
        quantity,
        name: cleanName,
        sku: matchesCatalog.sku, // Assigned/predicted SKU from catalog!
        matchedName: matchesCatalog.name
      });
    } else {
      items.push({
        quantity,
        name: cleanName,
        sku: sku // Fallback to raw parsed SKU or empty
      });
    }
  }

  return items;
}

export const CATALOG_KEYWORDS = ['מלט', 'חול', 'בידוד', 'בלוק', 'סומסום', 'טיח', 'דבק', 'גבס', 'סיד', 'שומשום', 'חצץ', 'איטונג', 'סיקה', 'ברזל', 'טיט'];

export function isKnownProduct(name: string) {
  return CATALOG_KEYWORDS.some(keyword => name.includes(keyword)) || !!findCatalogProduct(name);
}

/**
 * Utility to combine class names
 */
export function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
