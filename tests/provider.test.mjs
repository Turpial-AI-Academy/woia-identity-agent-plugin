import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {initial,execute,actions} from '../skills/woia-identity/scripts/provider.mjs';
 const hash=p=>createHash('sha256').update(JSON.stringify(p)).digest('hex');
 const department="Data";
 function request(s,action,payload,approved=false,target='subject',overrides={}){return {organization:s.organization,action,target,payload,operation_id:'op-'+s.revision,expected_revision:s.revision,evidence:{source:'synthetic-source',reference:'synthetic-reference',recorded_at:'2026-10-07T00:00:00Z'},authority:{authenticated:true,current:true,organization:s.organization,actor:'synthetic-actor',policy_revision:'synthetic-policy-1',actions,resources:['subject','other'],fields:['kind','display_name','contact_identifiers','aliases','external_refs'],source_fields:['kind','display_name','contact_identifiers','aliases','external_refs'],department,owner:'Synthetic owner',identity_verified:true,relationship_conflicts_checked:true,...(approved?{approval:{approved:true,current:true,principal:'synthetic-independent-owner',payload_digest:hash(payload),action,target,organization:s.organization,policy_revision:'synthetic-policy-1'}}:{}),...overrides}}}
 function run(s,a,p,approved=false,target='subject',overrides={}){return execute(s,request(s,a,p,approved,target,overrides))}
test('identity lifecycle preserves shared identity and original merge IDs',()=>{
 let s=initial('synthetic-org');
 s=run(s,'identity.create',{kind:'Person',display_name:'Synthetic A'}).state;
 assert.equal(s.identities.subject.kind,'Person');
 s=run(s,'identity.update',{display_name:'Synthetic B'}).state;
 s=run(s,'identity.alias.link',{alias_subject_id:'synthetic-alias',effective_from:'2026-10-07'}).state;
 assert.equal(run(s,'identity.read',{}).result.display_name,'Synthetic B');
 assert.equal(run(s,'identity.search',{query:'Synthetic'}).result.length,1);
 s=run(s,'identity.alias.unlink',{alias_subject_id:'synthetic-alias',effective_from:'2026-10-07',effective_to:'2026-10-08'}).state;
 s=run(s,'identity.external-ref.link',{namespace_id:'synthetic-source',object_type:'Person',external_id:'external-1',lifecycle_scope:'active'}).state;
 s=run(s,'identity.external-ref.unlink',{namespace_id:'synthetic-source',object_type:'Person',external_id:'external-1',lifecycle_scope:'active'}).state;
 s=run(s,'identity.correct',{display_name:'Corrected'},true).state;
 s=run(s,'identity.create',{kind:'Person',display_name:'Other'},false,'other').state;
 s=run(s,'identity.merge',{source_id:'other',effective_from:'2026-10-09'},true).state;
 assert.equal(s.identities.other.merged_into,'subject');assert.ok(s.identities.subject.aliases.some(a=>a.alias_subject_id==='other'));
 assert.equal(s.history.length,9);assert.equal(s.identities.subject.permissions,undefined);
});
test('identity forbids relationship ownership, unavailable fields and unguided merge',()=>{
 const s=run(initial('synthetic-org'),'identity.create',{kind:'Person',display_name:'A'}).state;
 assert.throws(()=>run(s,'identity.update',{tenant:true}),/UNOWNED_FIELDS|FIELD_SOURCE_AUTHORITY/);
 assert.throws(()=>run(s,'identity.update',{display_name:'B'},false,'subject',{source_fields:[]}),/FIELD_SOURCE_AUTHORITY/);
 assert.throws(()=>run(s,'identity.merge',{source_id:'other',effective_from:'2026-10-09'},false,'subject',{department:'Sales'}),/DATA_GOVERNANCE_REQUIRED/);
 const r=run(s,'identity.read',{},false,'subject',{fields:[]}).result;assert.equal(r.display_name,undefined);
});
test('organization authentication action resource and provenance guards fail closed',()=>{const s=initial('synthetic-org');const q=request(s,'identity.create',{"kind":"Person","display_name":"Synthetic"});assert.throws(()=>execute(s,{...q,organization:'other-org'}),/ORGANIZATION_SCOPE/);for(const authority of [{...q.authority,authenticated:false},{...q.authority,revoked:true},{...q.authority,current:false},{...q.authority,hold:true}])assert.throws(()=>execute(s,{...q,authority}),/AUTHORITY_REQUIRED/);assert.throws(()=>execute(s,{...q,authority:{...q.authority,resources:[]}}),/RESOURCE_SCOPE/);assert.throws(()=>execute(s,{...q,authority:{...q.authority,actions:[]}}),/ACTION_DENIED/);assert.throws(()=>execute(s,{...q,evidence:{}}),/PROVENANCE_REQUIRED/)});
test('idempotent receipt collision and stale concurrent revision preserve original state',()=>{const s=initial('synthetic-org');const q=request(s,'identity.create',{"kind":"Person","display_name":"Synthetic"});const out=execute(s,q);assert.equal(s.revision,0);assert.deepEqual(execute(out.state,q),out);assert.throws(()=>execute(out.state,{...q,payload:{...q.payload,unexpected:true}}),/OPERATION_CONFLICT/);assert.throws(()=>execute(out.state,{...q,operation_id:'concurrent'}),/REVISION_CONFLICT/);assert.equal(out.state.history.length,1)});

test('caller mutation cannot alter accepted state or saved operation result',()=>{const s=initial('synthetic-org');const q=request(s,'identity.create',{kind: 'Person', display_name: 'Synthetic',contact_identifiers:[{source: 'synthetic',id: 'original'}]});const out=execute(s,q);const accepted=JSON.stringify(out.state);q.evidence.reference='changed-after';q.payload.injected='changed-after';if(q.payload.contact_identifiers)q.payload.contact_identifiers[0].id='changed-after';out.result.injected='changed-after';assert.equal(JSON.stringify(out.state),accepted)});
test('canonical external reference keeps namespace object type and lifecycle association',()=>{
 let s=run(initial('synthetic-org'),'identity.create',{kind:'Person',display_name:'A'}).state;
 s=run(s,'identity.create',{kind:'Person',display_name:'B'},false,'other').state;
 const ref={namespace_id:'synthetic',object_type:'Person',external_id:'same-id',lifecycle_scope:'lifecycle-1'};
 s=run(s,'identity.external-ref.link',ref).state;
 for(const variation of [{object_type:'Organization'},{lifecycle_scope:'lifecycle-2'},{namespace_id:'another-namespace'}])s=run(s,'identity.external-ref.link',{...ref,...variation},false,'other').state;
 assert.equal(s.identities.other.external_refs.length,3);
 assert.throws(()=>run(s,'identity.external-ref.link',ref,false,'other'),/EXTERNAL_REF_CONFLICT/);
 assert.throws(()=>run(s,'identity.external-ref.link',{namespace_id:'x',external_id:'missing-components'}),/EXTERNAL_REF_REQUIRED/);
 assert.throws(()=>run(s,'identity.external-ref.unlink',ref,false,'subject',{source_fields:[]}),/FIELD_SOURCE_AUTHORITY/);
 s=run(s,'identity.external-ref.unlink',ref).state;assert.equal(s.identities.subject.external_refs.length,0);assert.equal(s.identities.other.external_refs.length,3);
});
test('temporal directed aliases preserve history and cannot collide with subject IDs',()=>{
 let s=run(initial('synthetic-org'),'identity.create',{kind:'Person',display_name:'A'}).state;
 s=run(s,'identity.create',{kind:'Person',display_name:'B'},false,'other').state;
 assert.throws(()=>run(s,'identity.alias.link',{alias_subject_id:'other',effective_from:'2026-10-07'}),/REQUIRES_MERGE/);
 assert.throws(()=>run(s,'identity.alias.link',{alias_subject_id:'subject',effective_from:'2026-10-07'}),/ALIAS_REQUIRED/);
 const alias={alias_subject_id:'synthetic-old-id',effective_from:'2026-10-07'};
 assert.throws(()=>run(s,'identity.alias.link',alias,false,'subject',{source_fields:[]}),/FIELD_SOURCE_AUTHORITY/);
 s=run(s,'identity.alias.link',alias).state;
 assert.throws(()=>run(s,'identity.alias.link',alias,false,'other'),/ALIAS_CONFLICT/);
 s=run(s,'identity.alias.unlink',{...alias,effective_to:'2026-10-08'}).state;
 assert.equal(s.identities.subject.aliases[0].effective_from,'2026-10-07');assert.equal(s.identities.subject.aliases[0].effective_to,'2026-10-08');
 s=run(s,'identity.alias.link',{...alias,effective_from:'2026-10-09'},false,'other').state;
 assert.equal(s.identities.other.aliases[0].effective_from,'2026-10-09');
});
