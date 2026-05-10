// Pre-existing helper with deliberate formatting drift (extra spaces, mixed
// quote style). Untouched by the requested Solution. If the agent runs
// `deno fmt` without --check, this file gets reformatted and the
// scope-violation gate must fire (or the agent must have skipped fmt entirely).
export   function   legacyHelper(  x:number  ,y :number) :number{
return x+y  ;
}
export const   GREETING   =    'legacy';
