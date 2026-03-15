const ProductPostgres = require('./models/ProductPostgres');
require('dotenv').config();

async function testProducts() {
  try {
    console.log('🔍 Testing product fetching...');
    
    // Get all products
    const allProducts = await ProductPostgres.findAll();
    console.log(`📦 Found ${allProducts.length} products in database`);
    
    // Group by category
    const grouped = allProducts.reduce((acc, product) => {
      const category = product.category || 'uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(product);
      return acc;
    }, {});
    
    console.log('\n📊 Products by category:');
    Object.entries(grouped).forEach(([category, products]) => {
      console.log(`\n${category.toUpperCase()} (${products.length} products):`);
      products.slice(0, 3).forEach(product => {
        console.log(`  - ${product.name} (${product.brand}) - ₹${product.price}`);
      });
      if (products.length > 3) {
        console.log(`  ... and ${products.length - 3} more`);
      }
    });
    
    // Test specific categories
    console.log('\n💻 Laptop category test:');
    const laptops = await ProductPostgres.findAll({ category: 'laptop' });
    console.log(`Found ${laptops.length} laptops`);
    
    console.log('\n🖥️ Desktop category test:');
    const desktops = await ProductPostgres.findAll({ category: 'desktop' });
    console.log(`Found ${desktops.length} desktops`);
    
    console.log('\n🎧 Accessories category test:');
    const accessories = await ProductPostgres.findAll({ category: 'accessories' });
    console.log(`Found ${accessories.length} accessories`);
    
    console.log('\n✅ Product testing completed successfully!');
    
  } catch (error) {
    console.error('💥 Error testing products:', error);
    process.exit(1);
  }
}

testProducts().then(() => {
  console.log('🏁 Test finished');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
