(async () => {
	const m = await import('../src/models/vendorShop/product.model.js');
	console.log('module:', m);
	console.log('keys:', Object.keys(m));
	console.log('has default:', 'default' in m);
	console.log('module export default type:', typeof m.default);
	const v = await import('../src/models/vendorShop/variant.model.js');
	console.log('variant keys:', Object.keys(v));
	console.log('variant has default:', 'default' in v);
	console.log('variant default type:', typeof v.default);
  
	// also check CommonJS require result
	const { createRequire } = await import('module');
	const require = createRequire(import.meta.url);
	const cjs = require('../src/models/vendorShop/product.model.js');
	console.log('cjs require result keys:', Object.keys(cjs));
	console.log('cjs typeof:', typeof cjs);
})();
