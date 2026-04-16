import fs from 'fs'
import path from 'path'
import { createHash } from 'crypto'
import { createClient } from '@supabase/supabase-js'

function loadEnvFile(fileName) {
  const filePath = path.resolve(process.cwd(), fileName)
  if (!fs.existsSync(filePath)) return

  const raw = fs.readFileSync(filePath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue
    const index = line.indexOf('=')
    if (index === -1) continue
    const key = line.slice(0, index).trim()
    const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')
    if (key && !(key in process.env)) {
      process.env[key] = value
    }
  }
}

loadEnvFile('.env.local')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase credentials in .env.local')
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const passwordHash = createHash('sha256').update('BigCatDemo@2026').digest('hex')
const now = new Date().toISOString()

function toUuid(seed) {
  const hex = createHash('md5').update(seed).digest('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

const merchants = [
  {
    id: toUuid('merchant_seed_electrohub'),
    email: 'electrohub@bigcat.demo',
    name: 'ElectroHub',
    full_name: 'ElectroHub Nigeria',
    role: 'merchant',
    phone: '08030000001',
    business_name: 'ElectroHub Nigeria',
    business_category: 'Electronics',
    business_description: 'Phones, gadgets, and home electronics for modern shoppers.',
    location: 'Ikeja, Lagos',
    avatar_url: '/placeholder-user.jpg',
    setup_completed: true,
    password_hash: passwordHash,
    updated_at: now,
  },
  {
    id: toUuid('merchant_seed_zuristyle'),
    email: 'zuristyle@bigcat.demo',
    name: 'ZuriStyle',
    full_name: 'Zuri Style House',
    role: 'merchant',
    phone: '08030000002',
    business_name: 'Zuri Style House',
    business_category: 'Fashion',
    business_description: 'Affordable fashion, footwear, and accessories with premium finishing.',
    location: 'Yaba, Lagos',
    avatar_url: '/Picture1.jpg',
    setup_completed: true,
    password_hash: passwordHash,
    updated_at: now,
  },
  {
    id: toUuid('merchant_seed_mamaharvest'),
    email: 'mamaharvest@bigcat.demo',
    name: 'Mama Harvest',
    full_name: 'Mama Harvest Foods',
    role: 'merchant',
    phone: '08030000003',
    business_name: 'Mama Harvest Foods',
    business_category: 'Food & Beverage',
    business_description: 'Fresh groceries, snacks, and pantry staples delivered quickly.',
    location: 'Wuse, Abuja',
    avatar_url: '/Picture1.jpg',
    setup_completed: true,
    password_hash: passwordHash,
    updated_at: now,
  },
  {
    id: toUuid('merchant_seed_glownest'),
    email: 'glownest@bigcat.demo',
    name: 'GlowNest',
    full_name: 'GlowNest Beauty',
    role: 'merchant',
    phone: '08030000004',
    business_name: 'GlowNest Beauty',
    business_category: 'Health & Beauty',
    business_description: 'Skincare, wellness, and beauty essentials from trusted brands.',
    location: 'Port Harcourt',
    avatar_url: '/placeholder-user.jpg',
    setup_completed: true,
    password_hash: passwordHash,
    updated_at: now,
  },
  {
    id: toUuid('merchant_seed_homecraft'),
    email: 'homecraft@bigcat.demo',
    name: 'HomeCraft',
    full_name: 'HomeCraft Living',
    role: 'merchant',
    phone: '08030000005',
    business_name: 'HomeCraft Living',
    business_category: 'Home & Living',
    business_description: 'Home décor, small appliances, and everyday living essentials.',
    location: 'Enugu',
    avatar_url: '/placeholder-user.jpg',
    setup_completed: true,
    password_hash: passwordHash,
    updated_at: now,
  },
  {
    id: toUuid('merchant_seed_greenharvest'),
    email: 'greenharvest@bigcat.demo',
    name: 'GreenHarvest',
    full_name: 'GreenHarvest Agro',
    role: 'merchant',
    phone: '08030000006',
    business_name: 'GreenHarvest Agro',
    business_category: 'Agriculture',
    business_description: 'Farm produce, agro tools, seeds, and storage supplies.',
    location: 'Jos',
    avatar_url: '/placeholder-user.jpg',
    setup_completed: true,
    password_hash: passwordHash,
    updated_at: now,
  },
  {
    id: toUuid('merchant_seed_peakfit'),
    email: 'peakfit@bigcat.demo',
    name: 'PeakFit',
    full_name: 'PeakFit Sports',
    role: 'merchant',
    phone: '08030000007',
    business_name: 'PeakFit Sports',
    business_category: 'Sports',
    business_description: 'Fitness, outdoor gear, and active lifestyle accessories.',
    location: 'Ibadan',
    avatar_url: '/placeholder-user.jpg',
    setup_completed: true,
    password_hash: passwordHash,
    updated_at: now,
  },
  {
    id: toUuid('merchant_seed_littlesteps'),
    email: 'littlesteps@bigcat.demo',
    name: 'LittleSteps',
    full_name: 'LittleSteps Kids',
    role: 'merchant',
    phone: '08030000008',
    business_name: 'LittleSteps Kids',
    business_category: 'Baby & Kids',
    business_description: 'Toys, baby care, school items, and children’s essentials.',
    location: 'Asaba',
    avatar_url: '/placeholder-user.jpg',
    setup_completed: true,
    password_hash: passwordHash,
    updated_at: now,
  },
  {
    id: toUuid('merchant_seed_drivecore'),
    email: 'drivecore@bigcat.demo',
    name: 'DriveCore',
    full_name: 'DriveCore Auto',
    role: 'merchant',
    phone: '08030000009',
    business_name: 'DriveCore Auto',
    business_category: 'Automotive',
    business_description: 'Car care, accessories, batteries, and emergency road tools.',
    location: 'Benin City',
    avatar_url: '/placeholder-user.jpg',
    setup_completed: true,
    password_hash: passwordHash,
    updated_at: now,
  },
  {
    id: toUuid('merchant_seed_studysphere'),
    email: 'studysphere@bigcat.demo',
    name: 'StudySphere',
    full_name: 'StudySphere Books & Media',
    role: 'merchant',
    phone: '08030000010',
    business_name: 'StudySphere Books & Media',
    business_category: 'Books & Media',
    business_description: 'Books, work tools, desk accessories, and learning resources.',
    location: 'Uyo',
    avatar_url: '/placeholder-user.jpg',
    setup_completed: true,
    password_hash: passwordHash,
    updated_at: now,
  },
]

const productCatalog = [
  ['merchant_seed_electrohub', 'Electronics', [
    ['Smartphone XPro 8', 285000, 'Fast 5G smartphone with long battery life and crisp OLED display.'],
    ['Wireless Earbuds Lite', 32000, 'Compact noise-reducing earbuds with charging case.'],
    ['Portable Bluetooth Speaker', 24500, 'Loud portable speaker for indoor and outdoor use.'],
    ['Mini Power Bank 20000mAh', 18500, 'Reliable fast-charging power bank for daily use.'],
    ['LED Smart TV 43 inch', 265000, 'Slim smart TV for home entertainment and streaming.'],
  ]],
  ['merchant_seed_zuristyle', 'Fashion', [
    ['Classic Senator Wear', 45000, 'Premium ready-to-wear senator set with clean tailoring.'],
    ['Leather Work Bag', 38000, 'Stylish unisex office bag with durable leather finish.'],
    ['Women\'s Casual Sneakers', 29000, 'Comfortable sneakers for everyday movement.'],
    ['Ankara Midi Dress', 26000, 'Bright patterned Ankara outfit for events and daily wear.'],
    ['Luxury Wristwatch', 52000, 'Elegant wristwatch with modern premium look.'],
  ]],
  ['merchant_seed_mamaharvest', 'Food & Drinks', [
    ['50kg Premium Rice Bag', 78000, 'Clean and stone-free long-grain rice for family meals.'],
    ['Fresh Palm Oil 5L', 18500, 'Rich red palm oil processed for home and restaurant use.'],
    ['Crunchy Plantain Chips Box', 9500, 'Crispy plantain snack packs for homes and offices.'],
    ['Natural Honey Jar', 12500, 'Pure golden honey sourced from trusted local farms.'],
    ['Spice Mix Combo Pack', 7800, 'Balanced mix of essential spices for Nigerian dishes.'],
  ]],
  ['merchant_seed_glownest', 'Health & Beauty', [
    ['Vitamin C Face Serum', 14500, 'Brightening facial serum for smooth glowing skin.'],
    ['Body Lotion Repair Plus', 11200, 'Hydrating lotion for dry skin and long-lasting moisture.'],
    ['Makeup Brush Set', 9800, 'Soft beauty brush set for daily and professional use.'],
    ['Hair Growth Oil Blend', 13500, 'Nourishing oil blend for healthy scalp and fuller hair.'],
    ['Men\'s Grooming Kit', 22000, 'Complete grooming pack with trimmer and care accessories.'],
  ]],
  ['merchant_seed_homecraft', 'Home & Living', [
    ['Non-Stick Cookware Set', 58000, 'Modern kitchen cookware for easy daily cooking.'],
    ['Foldable Laundry Basket', 8500, 'Space-saving laundry basket for compact homes.'],
    ['Electric Kettle 2L', 16000, 'Quick-boil kettle with safe auto shutoff.'],
    ['Luxury Bedspread Set', 36500, 'Soft premium bedspread set for a polished bedroom look.'],
    ['Dining Table Runner', 7200, 'Decorative table runner to brighten dining spaces.'],
  ]],
  ['merchant_seed_greenharvest', 'Agriculture', [
    ['Hybrid Maize Seeds Pack', 6800, 'High-yield seed pack suitable for seasonal farming.'],
    ['Organic Fertilizer 25kg', 17500, 'Nutrient-rich fertilizer for stronger harvests.'],
    ['Manual Sprayer Tank', 22000, 'Sturdy handheld sprayer for farm and garden care.'],
    ['Cassava Stem Bundle', 9000, 'Healthy planting stems for reliable cassava cultivation.'],
    ['Poultry Feed Starter Bag', 14800, 'Balanced feed formula for young birds and quick growth.'],
  ]],
  ['merchant_seed_peakfit', 'Sports', [
    ['Home Workout Dumbbells', 27500, 'Durable dumbbell pair for strength training at home.'],
    ['Yoga Mat Pro', 9200, 'Thick exercise mat with anti-slip grip.'],
    ['Football Boots Elite', 34000, 'Comfortable boots designed for control and speed.'],
    ['Hydration Flask 1L', 7600, 'Insulated water flask for workouts and outdoor trips.'],
    ['Resistance Bands Set', 11800, 'Portable training bands for flexible workouts anywhere.'],
  ]],
  ['merchant_seed_littlesteps', 'Baby & Kids', [
    ['Baby Feeding Chair', 42000, 'Strong and comfortable chair for easy feeding time.'],
    ['Educational Toy Blocks', 9800, 'Colourful blocks that help learning and coordination.'],
    ['School Backpack Set', 14500, 'Durable backpack set for nursery and primary school.'],
    ['Baby Diaper Pack Large', 12800, 'Soft absorbent diapers for all-day comfort.'],
    ['Kids Story Book Bundle', 8700, 'Fun book collection for bedtime and learning.'],
  ]],
  ['merchant_seed_drivecore', 'Automotive', [
    ['Car Vacuum Cleaner', 19500, 'Portable vacuum cleaner to keep car interiors neat.'],
    ['Heavy Duty Jump Starter', 68000, 'Reliable emergency starter for low-battery situations.'],
    ['Seat Cover Set', 29500, 'Stylish protective seat covers for most vehicles.'],
    ['Dashboard Phone Mount', 6500, 'Secure phone holder for maps and hands-free use.'],
    ['Engine Oil 5W-30', 21000, 'Quality synthetic engine oil for smooth performance.'],
  ]],
  ['merchant_seed_studysphere', 'Books & Media', [
    ['Business Growth Playbook', 13500, 'Practical business book for SME founders and operators.'],
    ['Executive Office Chair', 89000, 'Comfortable chair built for long productive workdays.'],
    ['Laptop Stand Adjustable', 11800, 'Ergonomic desk stand for better posture and airflow.'],
    ['A4 Paper Ream Box', 24000, 'Bulk paper supply for offices and school use.'],
    ['Desk Organizer Set', 9500, 'Clean modern organizer set for a tidy workspace.'],
  ]],
]

const merchantIdMap = Object.fromEntries(merchants.map((merchant) => [merchant.email, merchant.id]))

const categoryImages = {
  'Electronics': [
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1546054454-aa26e2b734c7?auto=format&fit=crop&w=900&q=80',
  ],
  'Fashion': [
    'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&q=80',
  ],
  'Food & Drinks': [
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80',
  ],
  'Health & Beauty': [
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=900&q=80',
  ],
  'Home & Living': [
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=900&q=80',
  ],
  'Agriculture': [
    'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80',
  ],
  'Sports': [
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80',
  ],
  'Baby & Kids': [
    'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=900&q=80',
  ],
  'Automotive': [
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=900&q=80',
  ],
  'Books & Media': [
    'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80',
  ],
}

const productCatalogWithEmails = [
  ['electrohub@bigcat.demo', 'Electronics', [
    ['Smartphone XPro 8', 285000, 'Fast 5G smartphone with long battery life and crisp OLED display.'],
    ['Wireless Earbuds Lite', 32000, 'Compact noise-reducing earbuds with charging case.'],
    ['Portable Bluetooth Speaker', 24500, 'Loud portable speaker for indoor and outdoor use.'],
    ['Mini Power Bank 20000mAh', 18500, 'Reliable fast-charging power bank for daily use.'],
    ['LED Smart TV 43 inch', 265000, 'Slim smart TV for home entertainment and streaming.'],
  ]],
  ['zuristyle@bigcat.demo', 'Fashion', [
    ['Classic Senator Wear', 45000, 'Premium ready-to-wear senator set with clean tailoring.'],
    ['Leather Work Bag', 38000, 'Stylish unisex office bag with durable leather finish.'],
    ['Women\'s Casual Sneakers', 29000, 'Comfortable sneakers for everyday movement.'],
    ['Ankara Midi Dress', 26000, 'Bright patterned Ankara outfit for events and daily wear.'],
    ['Luxury Wristwatch', 52000, 'Elegant wristwatch with modern premium look.'],
  ]],
  ['mamaharvest@bigcat.demo', 'Food & Drinks', [
    ['50kg Premium Rice Bag', 78000, 'Clean and stone-free long-grain rice for family meals.'],
    ['Fresh Palm Oil 5L', 18500, 'Rich red palm oil processed for home and restaurant use.'],
    ['Crunchy Plantain Chips Box', 9500, 'Crispy plantain snack packs for homes and offices.'],
    ['Natural Honey Jar', 12500, 'Pure golden honey sourced from trusted local farms.'],
    ['Spice Mix Combo Pack', 7800, 'Balanced mix of essential spices for Nigerian dishes.'],
  ]],
  ['glownest@bigcat.demo', 'Health & Beauty', [
    ['Vitamin C Face Serum', 14500, 'Brightening facial serum for smooth glowing skin.'],
    ['Body Lotion Repair Plus', 11200, 'Hydrating lotion for dry skin and long-lasting moisture.'],
    ['Makeup Brush Set', 9800, 'Soft beauty brush set for daily and professional use.'],
    ['Hair Growth Oil Blend', 13500, 'Nourishing oil blend for healthy scalp and fuller hair.'],
    ['Men\'s Grooming Kit', 22000, 'Complete grooming pack with trimmer and care accessories.'],
  ]],
  ['homecraft@bigcat.demo', 'Home & Living', [
    ['Non-Stick Cookware Set', 58000, 'Modern kitchen cookware for easy daily cooking.'],
    ['Foldable Laundry Basket', 8500, 'Space-saving laundry basket for compact homes.'],
    ['Electric Kettle 2L', 16000, 'Quick-boil kettle with safe auto shutoff.'],
    ['Luxury Bedspread Set', 36500, 'Soft premium bedspread set for a polished bedroom look.'],
    ['Dining Table Runner', 7200, 'Decorative table runner to brighten dining spaces.'],
  ]],
  ['greenharvest@bigcat.demo', 'Agriculture', [
    ['Hybrid Maize Seeds Pack', 6800, 'High-yield seed pack suitable for seasonal farming.'],
    ['Organic Fertilizer 25kg', 17500, 'Nutrient-rich fertilizer for stronger harvests.'],
    ['Manual Sprayer Tank', 22000, 'Sturdy handheld sprayer for farm and garden care.'],
    ['Cassava Stem Bundle', 9000, 'Healthy planting stems for reliable cassava cultivation.'],
    ['Poultry Feed Starter Bag', 14800, 'Balanced feed formula for young birds and quick growth.'],
  ]],
  ['peakfit@bigcat.demo', 'Sports', [
    ['Home Workout Dumbbells', 27500, 'Durable dumbbell pair for strength training at home.'],
    ['Yoga Mat Pro', 9200, 'Thick exercise mat with anti-slip grip.'],
    ['Football Boots Elite', 34000, 'Comfortable boots designed for control and speed.'],
    ['Hydration Flask 1L', 7600, 'Insulated water flask for workouts and outdoor trips.'],
    ['Resistance Bands Set', 11800, 'Portable training bands for flexible workouts anywhere.'],
  ]],
  ['littlesteps@bigcat.demo', 'Baby & Kids', [
    ['Baby Feeding Chair', 42000, 'Strong and comfortable chair for easy feeding time.'],
    ['Educational Toy Blocks', 9800, 'Colourful blocks that help learning and coordination.'],
    ['School Backpack Set', 14500, 'Durable backpack set for nursery and primary school.'],
    ['Baby Diaper Pack Large', 12800, 'Soft absorbent diapers for all-day comfort.'],
    ['Kids Story Book Bundle', 8700, 'Fun book collection for bedtime and learning.'],
  ]],
  ['drivecore@bigcat.demo', 'Automotive', [
    ['Car Vacuum Cleaner', 19500, 'Portable vacuum cleaner to keep car interiors neat.'],
    ['Heavy Duty Jump Starter', 68000, 'Reliable emergency starter for low-battery situations.'],
    ['Seat Cover Set', 29500, 'Stylish protective seat covers for most vehicles.'],
    ['Dashboard Phone Mount', 6500, 'Secure phone holder for maps and hands-free use.'],
    ['Engine Oil 5W-30', 21000, 'Quality synthetic engine oil for smooth performance.'],
  ]],
  ['studysphere@bigcat.demo', 'Books & Media', [
    ['Business Growth Playbook', 13500, 'Practical business book for SME founders and operators.'],
    ['Executive Office Chair', 89000, 'Comfortable chair built for long productive workdays.'],
    ['Laptop Stand Adjustable', 11800, 'Ergonomic desk stand for better posture and airflow.'],
    ['A4 Paper Ream Box', 24000, 'Bulk paper supply for offices and school use.'],
    ['Desk Organizer Set', 9500, 'Clean modern organizer set for a tidy workspace.'],
  ]],
]

const products = productCatalogWithEmails.flatMap(([merchantEmail, category, items]) =>
  items.map(([name, price, description], index) => ({
    id: toUuid(`product_seed_${merchantEmail}_${index + 1}`),
    merchant_id: merchantIdMap[merchantEmail],
    name,
    description,
    price,
    category,
    image_url: (categoryImages[category] || ['https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=900&q=80'])[index % ((categoryImages[category] || []).length || 1)],
    stock: 20 + index * 7,
    is_active: true,
    updated_at: now,
  }))
)

async function main() {
  const { error: merchantError } = await supabase.from('auth_users').upsert(merchants, { onConflict: 'id' })
  if (merchantError) throw merchantError

  const { error: productError } = await supabase.from('products').upsert(products, { onConflict: 'id' })
  if (productError) throw productError

  const { count: merchantCount } = await supabase.from('auth_users').select('*', { count: 'exact', head: true }).eq('role', 'merchant')
  const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true })
  const { data: categories } = await supabase.from('products').select('category').limit(200)

  console.log('Marketplace seeded successfully')
  console.log(JSON.stringify({
    merchantsSeeded: merchants.length,
    productsSeeded: products.length,
    merchantCount,
    productCount,
    categories: [...new Set((categories || []).map((row) => row.category).filter(Boolean))],
  }, null, 2))
}

main().catch((error) => {
  console.error('Seeding failed:', error)
  process.exit(1)
})
