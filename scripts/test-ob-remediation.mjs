import {spawn} from 'node:child_process';
const tests=[
 'src/lib/brobot/orthobullets/claim-extraction-contract-v1.test.ts',
 'src/lib/brobot/orthobullets/budgeted-model-client.test.ts',
 'src/lib/brobot/orthobullets/claim-review-pipeline.test.ts',
 'src/lib/brobot/orthobullets/ob-question-identity.test.ts',
 'src/lib/brobot/orthobullets/ob-claim-resolution.test.ts',
 'src/lib/brobot/orthobullets/ob-production-runner-lib.test.ts',
 'src/lib/education/entity-promotion/entity-resolver-v2.test.ts',
 'src/lib/brobot/kg/retrieve-rpc.test.ts',
 'src/lib/brobot/kg/knowledge-v2.test.ts',
 'src/lib/brobot/kg/policy.test.ts',
 'src/lib/brobot/kg/privacy.test.ts',
 'src/lib/brobot/kg/telemetry.test.ts',
 'scripts/lib/education/ob-enrichment-plan.test.ts',
];
function run(file,args){return new Promise(resolve=>{
 const child=spawn(process.execPath,args,{cwd:process.cwd(),env:process.env,stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',chunk=>output+=chunk);
 child.on('error',error=>{console.error(`FAIL ${file}: ${error.code}`);resolve(false);});
 child.on('exit',code=>{console.log(`${code===0?'PASS':'FAIL'} ${file}`);if(code!==0)console.error(output.slice(-6000));resolve(code===0);});
});}
let success=true;
for(let i=0;i<tests.length;i+=3){const results=await Promise.all(tests.slice(i,i+3).map(file=>run(file,['--experimental-strip-types','--experimental-loader','./scripts/lib/ts-alias-loader.mjs',file])));success=results.every(Boolean)&&success;}
success=await run('publication database integration',['scripts/lib/education/ob-claims-publication.integration.mjs'])&&success;
process.exitCode=success?0:1;
