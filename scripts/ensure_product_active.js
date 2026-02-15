const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('../models/Product');

async function main(){
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/unitech');
  const p = await Product.findOne();
  if(!p){
    console.error('No product found to update.');
    process.exit(1);
  }
  await Product.updateOne({ _id: p._id }, { $set: { isActive: true, stock: (p.stock && p.stock > 0) ? p.stock : 10 } }, { runValidators: false });
  console.log('Updated product', p._id.toString(), 'isActive=true');
  await mongoose.disconnect();
}

main().catch(err=>{console.error(err); process.exit(1);});
