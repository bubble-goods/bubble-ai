/**
 * Category enrichments for better embedding search.
 *
 * These enrichments add synonyms, example products, and related terms
 * to category names so they embed closer to product descriptions.
 *
 * Format: categoryCode -> array of additional terms
 */

export const categoryEnrichments: Record<string, string[]> = {
  // ===== FOOD, BEVERAGES & TOBACCO (fb-) =====

  // Beverages
  'fb-1': ['drinks', 'beverages', 'liquid refreshments'],
  'fb-1-3': ['coffee', 'espresso', 'cappuccino', 'latte', 'brew', 'java', 'roast'],
  'fb-1-3-1': ['coffee beans', 'whole bean coffee', 'roasted beans', 'arabica', 'robusta'],
  'fb-1-3-2': ['coffee pods', 'k-cups', 'nespresso', 'coffee capsules', 'single serve'],
  'fb-1-3-3': ['ground coffee', 'pre-ground', 'drip coffee', 'filter coffee'],
  'fb-1-3-4': ['ready to drink coffee', 'bottled coffee', 'canned coffee', 'cold brew', 'iced coffee'],
  'fb-1-6': ['hot chocolate', 'cocoa', 'hot cocoa', 'drinking chocolate'],
  'fb-1-7': ['juice', 'smoothie', 'milkshake', 'fruit drink', 'blend'],
  'fb-1-11': ['drink mix', 'powder mix', 'instant drink', 'beverage powder'],
  'fb-1-12': ['soda', 'pop', 'carbonated', 'fizzy drink', 'soft drink', 'sparkling'],
  'fb-1-13': ['sports drink', 'electrolyte', 'energy drink', 'hydration'],
  'fb-1-14': ['tea', 'herbal tea', 'green tea', 'black tea', 'chai', 'oolong', 'infusion'],
  'fb-1-15': ['water', 'mineral water', 'sparkling water', 'spring water', 'purified'],

  // Food Items - Bakery
  'fb-2-1': ['bakery', 'baked goods', 'bread', 'pastry', 'fresh baked'],
  'fb-2-1-1': ['bagels', 'bagel', 'breakfast bread', 'round bread'],
  'fb-2-1-2': ['bakery assortment', 'mixed bakery', 'variety pack', 'assorted pastries'],
  'fb-2-1-3': ['biscuits', 'scones', 'tea biscuits', 'buttermilk biscuits'],
  'fb-2-1-4': ['cakes', 'dessert bars', 'brownies', 'layer cake', 'sheet cake'],
  'fb-2-1-5': ['coffee cakes', 'crumb cake', 'streusel', 'breakfast cake'],
  'fb-2-1-6': ['cookies', 'biscotti', 'macarons', 'cookie', 'shortbread'],
  'fb-2-1-7': ['croissants', 'danish', 'puff pastry', 'laminated dough'],
  'fb-2-1-8': ['cupcakes', 'mini cakes', 'fairy cakes', 'muffin tops'],
  'fb-2-1-9': ['donuts', 'doughnuts', 'fritters', 'crullers', 'glazed'],
  'fb-2-1-10': ['bread loaves', 'sliced bread', 'sandwich bread', 'artisan bread', 'sourdough'],
  'fb-2-1-11': ['muffins', 'breakfast muffins', 'blueberry muffin', 'bran muffin'],
  'fb-2-1-12': ['pies', 'tarts', 'fruit pie', 'cream pie', 'pie crust'],
  'fb-2-1-13': ['rolls', 'dinner rolls', 'buns', 'kaiser rolls', 'brioche'],
  'fb-2-1-14': ['tortillas', 'wraps', 'flatbread', 'flour tortilla', 'corn tortilla'],

  // Candy & Chocolate
  'fb-2-3': ['candy', 'chocolate', 'sweets', 'confectionery', 'confection'],
  'fb-2-3-1': ['candy', 'hard candy', 'gummy', 'lollipop', 'caramel', 'taffy', 'licorice'],
  'fb-2-3-2': ['chocolate', 'chocolate bar', 'dark chocolate', 'milk chocolate', 'white chocolate', 'truffle', 'praline', 'cocoa', 'cacao'],

  // Condiments & Sauces
  'fb-2-4': ['condiments', 'sauces', 'dressings', 'toppings'],
  'fb-2-4-1': ['asian sauce', 'soy sauce', 'teriyaki', 'hoisin', 'fish sauce', 'oyster sauce'],
  'fb-2-4-2': ['bbq sauce', 'barbecue sauce', 'grilling sauce', 'smoky sauce'],
  'fb-2-4-3': ['cocktail sauce', 'seafood sauce', 'shrimp sauce'],
  'fb-2-4-4': ['curry paste', 'curry sauce', 'thai curry', 'indian curry', 'masala'],
  'fb-2-4-5': ['dessert topping', 'chocolate sauce', 'caramel sauce', 'fruit topping'],
  'fb-2-4-6': ['fish sauce', 'nam pla', 'nuoc mam', 'anchovy sauce'],
  'fb-2-4-7': ['gravy', 'gravy mix', 'brown gravy', 'turkey gravy'],
  'fb-2-4-8': ['hot sauce', 'chili sauce', 'pepper sauce', 'sriracha', 'tabasco', 'habanero', 'cayenne'],
  'fb-2-4-9': ['ketchup', 'catsup', 'tomato ketchup'],
  'fb-2-4-10': ['marinades', 'meat marinade', 'grilling marinade'],
  'fb-2-4-11': ['mayonnaise', 'mayo', 'aioli', 'egg-based sauce'],
  'fb-2-4-12': ['mustard', 'dijon', 'yellow mustard', 'whole grain mustard', 'spicy mustard'],
  'fb-2-4-13': ['olives', 'capers', 'olive', 'caper', 'mediterranean'],
  'fb-2-4-14': ['pasta sauce', 'marinara', 'tomato sauce', 'alfredo', 'pesto', 'bolognese', 'arrabbiata'],
  'fb-2-4-15': ['pickle relish', 'relish', 'sweet relish', 'dill relish'],
  'fb-2-4-16': ['pickled vegetables', 'pickles', 'pickled', 'gherkins', 'cornichons'],
  'fb-2-4-17': ['pizza sauce', 'pizza topping'],
  'fb-2-4-18': ['salad dressing', 'vinaigrette', 'ranch', 'caesar', 'italian dressing', 'balsamic'],
  'fb-2-4-19': ['salsa', 'mexican sauce', 'pico de gallo', 'verde', 'roja'],
  'fb-2-4-20': ['satay sauce', 'peanut sauce', 'thai sauce'],
  'fb-2-4-21': ['sweet and sour sauce', 'sweet sour', 'orange sauce'],
  'fb-2-4-22': ['taco sauce', 'enchilada sauce', 'mexican sauce'],
  'fb-2-4-23': ['tahini', 'sesame paste', 'sesame butter'],
  'fb-2-4-24': ['vinegar', 'balsamic vinegar', 'apple cider vinegar', 'red wine vinegar', 'white vinegar'],
  'fb-2-4-25': ['white sauce', 'cream sauce', 'bechamel', 'alfredo'],
  'fb-2-4-26': ['worcestershire sauce', 'worcester sauce', 'lea perrins'],

  // Cooking & Baking Ingredients
  'fb-2-5': ['cooking ingredients', 'baking ingredients', 'pantry staples'],
  'fb-2-5-2': ['baking chocolate', 'cocoa', 'unsweetened chocolate', 'chocolate chips', 'baking cocoa'],
  'fb-2-5-8': ['baking mixes', 'cake mix', 'brownie mix', 'muffin mix', 'pancake mix'],
  'fb-2-5-12': ['cooking oil', 'vegetable oil', 'canola oil', 'coconut oil', 'frying oil', 'culinary oil'],
  'fb-2-5-12-1': ['avocado oil', 'avocado cooking oil', 'high heat oil'],
  'fb-2-5-12-4': ['olive oil', 'extra virgin olive oil', 'evoo', 'italian olive oil', 'spanish olive oil', 'greek olive oil', 'finishing oil', 'cold pressed olive oil'],
  'fb-2-5-16': ['flour', 'all-purpose flour', 'bread flour', 'wheat flour', 'almond flour', 'gluten-free flour'],
  'fb-2-5-20': ['honey', 'raw honey', 'wildflower honey', 'manuka honey', 'local honey', 'honeycomb', 'hot honey', 'spicy honey', 'infused honey', 'artisan honey', 'organic honey', 'pure honey', 'creamed honey'],
  'fb-2-5-22': ['maple syrup', 'pure maple syrup', 'pancake syrup', 'maple', 'breakfast syrup'],
  'fb-2-5-28': ['sugar', 'cane sugar', 'brown sugar', 'powdered sugar', 'coconut sugar', 'sweetener'],
  'fb-2-5-30': ['sweeteners', 'artificial sweetener', 'stevia', 'monk fruit', 'erythritol', 'sugar substitute'],

  // Dairy Products
  'fb-2-6': ['dairy', 'milk products', 'dairy products'],
  'fb-2-6-1': ['butter', 'margarine', 'spread', 'unsalted butter', 'salted butter', 'european butter'],
  'fb-2-6-2': ['cheese', 'cheddar', 'mozzarella', 'parmesan', 'brie', 'gouda', 'swiss', 'artisan cheese'],
  'fb-2-6-3': ['coffee creamer', 'creamer', 'half and half', 'non-dairy creamer'],
  'fb-2-6-4': ['cottage cheese', 'ricotta', 'fresh cheese'],
  'fb-2-6-5': ['cream', 'heavy cream', 'whipping cream', 'sour cream', 'creme fraiche'],
  'fb-2-6-6': ['milk', 'whole milk', 'skim milk', 'oat milk', 'almond milk', 'plant milk'],
  'fb-2-6-7': ['whipped cream', 'whipped topping', 'cool whip'],
  'fb-2-6-8': ['yogurt', 'greek yogurt', 'probiotic', 'kefir', 'cultured'],

  // Dips & Spreads
  'fb-2-7': ['dips', 'spreads', 'dip', 'spread'],
  'fb-2-7-1': ['apple butter', 'fruit butter', 'pumpkin butter'],
  'fb-2-7-2': ['bruschetta', 'tomato topping', 'italian appetizer'],
  'fb-2-7-3': ['cheese dip', 'cheese spread', 'queso', 'cheese sauce', 'nacho cheese'],
  'fb-2-7-4': ['fruit spread', 'fruit preserve', 'fruit butter'],
  'fb-2-7-5': ['guacamole', 'avocado dip', 'mexican dip'],
  'fb-2-7-6': ['jam', 'jelly', 'preserves', 'marmalade', 'fruit jam', 'strawberry jam', 'grape jelly'],
  'fb-2-7-7': ['nut butter', 'peanut butter', 'almond butter', 'cashew butter', 'sunflower butter', 'seed butter'],
  'fb-2-7-8': ['hummus', 'chickpea dip', 'mediterranean dip'],
  'fb-2-7-9': ['tapenade', 'olive spread', 'olive dip'],
  'fb-2-7-10': ['vegetable dip', 'ranch dip', 'onion dip', 'spinach dip', 'artichoke dip'],

  // Fruits & Vegetables
  'fb-2-10': ['fruits', 'vegetables', 'produce', 'fresh produce'],
  'fb-2-10-4': ['dried fruit', 'dried fruits', 'dehydrated fruit', 'fruit snacks', 'raisins', 'dried mango', 'dried apricots'],
  'fb-2-10-7': ['fresh fruit', 'frozen fruit', 'berries', 'apples', 'oranges', 'bananas', 'fruit'],
  'fb-2-10-8': ['fresh vegetables', 'frozen vegetables', 'veggies', 'greens', 'peppers', 'onions'],

  // Grains, Rice & Cereal
  'fb-2-11': ['grains', 'rice', 'cereal', 'breakfast', 'carbs'],
  'fb-2-11-4': ['cereal', 'granola', 'breakfast cereal', 'oatmeal', 'muesli', 'corn flakes'],
  'fb-2-11-8': ['rice', 'white rice', 'brown rice', 'jasmine rice', 'basmati', 'wild rice', 'risotto'],
  'fb-2-11-9': ['quinoa', 'ancient grains', 'farro', 'bulgur', 'couscous'],

  // Meat, Seafood & Eggs
  'fb-2-12': ['meat', 'seafood', 'protein', 'butcher'],
  'fb-2-12-1': ['eggs', 'chicken eggs', 'farm eggs', 'organic eggs', 'free range'],
  'fb-2-12-2': ['meat', 'beef', 'pork', 'chicken', 'lamb', 'turkey', 'poultry'],
  'fb-2-12-3': ['seafood', 'fish', 'shellfish', 'shrimp', 'salmon', 'tuna', 'crab', 'lobster'],

  // Nuts, Seeds & Dried Fruit (separate from fb-2-10-4)
  'fb-2-13': ['nuts', 'seeds', 'nut', 'seed', 'legumes'],
  'fb-2-13-1': ['edible seeds', 'pumpkin seeds', 'sunflower seeds', 'chia seeds', 'flax seeds', 'hemp seeds'],
  'fb-2-13-2': ['nuts', 'almonds', 'cashews', 'walnuts', 'pecans', 'pistachios', 'peanuts', 'macadamia', 'mixed nuts'],

  // PASTA & NOODLES - Key category
  'fb-2-14': ['pasta', 'noodles', 'spaghetti', 'penne', 'rigatoni', 'linguine', 'fettuccine', 'macaroni', 'lasagna', 'ravioli', 'tortellini', 'orzo', 'farfalle', 'fusilli', 'Italian pasta', 'dried pasta', 'fresh pasta', 'egg noodles', 'rice noodles', 'ramen', 'udon', 'soba', 'wheat noodles', 'gluten-free pasta'],

  // Prepared Foods
  'fb-2-15': ['prepared foods', 'ready meals', 'frozen meals', 'heat and eat', 'convenience food'],
  'fb-2-15-1': ['frozen meals', 'tv dinners', 'microwave meals'],
  'fb-2-15-2': ['meal kits', 'recipe kits', 'cooking kits'],
  'fb-2-15-3': ['prepared salads', 'deli salads', 'potato salad', 'coleslaw'],
  'fb-2-15-4': ['prepared soups', 'fresh soup', 'refrigerated soup'],

  // Seasonings & Spices (actual taxonomy codes from database)
  'fb-2-16': ['seasonings', 'spices', 'herbs', 'seasoning', 'spice', 'dried herbs', 'spice blend', 'rub', 'marinade'],
  'fb-2-16-1': ['herbs', 'spices', 'dried herbs', 'basil', 'oregano', 'thyme', 'rosemary', 'parsley', 'cilantro', 'dill', 'cinnamon', 'cumin', 'paprika', 'turmeric', 'ginger', 'nutmeg', 'cloves', 'cardamom', 'coriander', 'smoked paprika', 'chili powder', 'curry powder', 'garlic powder', 'onion powder', 'seasoning', 'spice mix'],
  'fb-2-16-2': ['msg', 'monosodium glutamate', 'umami', 'flavor enhancer'],
  'fb-2-16-3': ['pepper', 'black pepper', 'peppercorns', 'white pepper', 'cayenne', 'chili pepper', 'ground pepper', 'cracked pepper'],
  'fb-2-16-4': ['salt', 'sea salt', 'kosher salt', 'himalayan salt', 'table salt', 'finishing salt', 'pink salt', 'fleur de sel'],

  // Snack Foods
  'fb-2-17': ['snacks', 'snack foods', 'snacking', 'munchies', 'finger food'],
  'fb-2-17-1': ['banana chips', 'plantain chips', 'fruit chips'],
  'fb-2-17-2': ['granola bars', 'cereal bars', 'energy bars', 'protein bars', 'snack bars', 'nutrition bars'],
  'fb-2-17-3': ['cheese puffs', 'cheese snacks', 'cheetos', 'cheese curls'],
  'fb-2-17-4': ['corn nuts', 'corn snacks', 'crunchy corn'],
  'fb-2-17-5': ['crackers', 'crispbread', 'water crackers', 'saltines', 'ritz', 'wheat thins', 'crisp bread', 'flatbread crackers'],
  'fb-2-17-6': ['croutons', 'salad croutons', 'bread crumbs'],
  'fb-2-17-7': ['dried squid', 'squid snacks', 'asian snacks'],
  'fb-2-17-8': ['pita chips', 'bagel chips', 'bread chips'],
  'fb-2-17-9': ['popcorn', 'kettle corn', 'microwave popcorn', 'movie popcorn', 'caramel corn'],
  'fb-2-17-10': ['pork rinds', 'chicharrones', 'pork skins'],
  'fb-2-17-11': ['potato chips', 'chips', 'crisps', 'kettle chips', 'tortilla chips', 'corn chips', 'veggie chips'],
  'fb-2-17-12': ['pretzels', 'pretzel', 'pretzel sticks', 'soft pretzels'],
  'fb-2-17-13': ['rice cakes', 'puffed rice', 'rice crackers', 'rice snacks'],
  'fb-2-17-14': ['seaweed snacks', 'nori', 'seaweed chips'],
  'fb-2-17-15': ['sesame sticks', 'sesame snacks'],
  'fb-2-17-16': ['snack cakes', 'little debbie', 'hostess', 'swiss rolls', 'ding dongs'],
  'fb-2-17-17': ['sticky rice cakes', 'mochi', 'rice cakes asian'],
  'fb-2-17-18': ['trail mix', 'snack mix', 'nut mix', 'party mix', 'chex mix'],

  // Soups & Broths
  'fb-2-18': ['soups', 'broths', 'soup', 'broth', 'stock', 'stew', 'chowder', 'bisque'],
  'fb-2-18-1': ['bouillon', 'bouillon cubes', 'stock cubes', 'soup base'],
  'fb-2-18-2': ['broth', 'chicken broth', 'beef broth', 'vegetable broth', 'bone broth'],
  'fb-2-18-3': ['chili', 'canned chili', 'bean chili'],
  'fb-2-18-4': ['soup', 'canned soup', 'tomato soup', 'chicken soup', 'vegetable soup', 'minestrone'],
  'fb-2-18-5': ['stew', 'beef stew', 'canned stew'],

  // Tofu, Soy & Vegetarian
  'fb-2-19': ['tofu', 'soy', 'vegetarian', 'vegan', 'plant-based', 'meat alternative'],
  'fb-2-19-1': ['meat alternatives', 'veggie burger', 'impossible', 'beyond meat', 'plant protein'],
  'fb-2-19-2': ['seitan', 'wheat gluten', 'mock duck'],
  'fb-2-19-3': ['tempeh', 'fermented soy', 'indonesian'],
  'fb-2-19-4': ['tofu', 'bean curd', 'silken tofu', 'firm tofu', 'extra firm'],
}

/**
 * Generate enriched embedding text for a category.
 * Combines category name, parent context, and enrichment terms.
 */
export function generateEnrichedText(
  categoryCode: string,
  categoryName: string,
  fullPath: string,
): string {
  const parts: string[] = []

  // Start with the category name
  parts.push(categoryName)

  // Add enrichments if available
  const enrichments = categoryEnrichments[categoryCode]
  if (enrichments && enrichments.length > 0) {
    parts.push(enrichments.join(', '))
  }

  // For categories without specific enrichments, add parent context
  // but in a product-friendly format
  if (!enrichments) {
    // Extract parent from path (e.g., "Food Items" from "Food, Beverages & Tobacco > Food Items > Pasta")
    const pathParts = fullPath.split(' > ')
    if (pathParts.length > 1) {
      // Add the immediate parent for context
      const parent = pathParts[pathParts.length - 2]
      if (parent && parent !== categoryName) {
        parts.push(parent.toLowerCase())
      }
    }
  }

  return parts.join(' - ')
}
