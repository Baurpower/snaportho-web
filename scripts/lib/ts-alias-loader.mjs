// Node's type-stripping runner does not resolve tsconfig paths or extensionless TS imports.
const srcRoot=new URL('../../src/',import.meta.url);
export async function resolve(specifier,context,nextResolve){
 if(specifier.startsWith('@/')){
  const base=new URL(specifier.slice(2),srcRoot);
  for(const candidate of [base.href,`${base.href}.ts`,`${base.href}/index.ts`]){
   try{return await nextResolve(candidate,context);}catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND'&&error.code!=='ERR_UNSUPPORTED_DIR_IMPORT')throw error;}
  }
 }
 if((specifier.startsWith('./')||specifier.startsWith('../'))&&!/\.[a-z0-9]+$/i.test(specifier)){
  try{return await nextResolve(`${specifier}.ts`,context);}catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;}
 }
 return nextResolve(specifier,context);
}
