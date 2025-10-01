console.log('worker initialized');

const module = await import('/lib.js').then(({ default: init }) => init());
console.log(module);
module.get_from_storage();
