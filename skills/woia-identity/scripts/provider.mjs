import {begin,finish,requireValue,ownKeys,approval,digest} from './guard.mjs';
export const actions=["identity.search","identity.read","identity.create","identity.update","identity.alias.link","identity.alias.unlink","identity.external-ref.link","identity.external-ref.unlink","identity.merge","identity.correct"];
const writes=actions.filter(a=>!["identity.search","identity.read"].includes(a));
export const initial=organization=>({organization,revision:0,operations:{},history:[],identities:{}});
export function execute(state,q){q=structuredClone(q);const c=begin(state,q,actions,writes);if(['identity.create','identity.update','identity.correct'].includes(q.action))requireValue(Object.keys(q.payload??{}).every(k=>q.authority.fields?.includes(k)&&q.authority.source_fields?.includes(k)),'FIELD_SOURCE_AUTHORITY');if(q.action.startsWith('identity.alias.')||q.action.startsWith('identity.external-ref.')){const field=q.action.startsWith('identity.alias.')?'aliases':'external_refs';requireValue(q.authority.fields?.includes(field)&&q.authority.source_fields?.includes(field),'FIELD_SOURCE_AUTHORITY')}if(['identity.merge','identity.correct'].includes(q.action)){requireValue(q.authority.department==='Data'&&q.authority.relationship_conflicts_checked===true,'DATA_GOVERNANCE_REQUIRED');approval(q);}  if(c.replay)return {state:c.next,result:c.replay};
 const records=c.next.identities??={};
 const project=record=>Object.fromEntries(Object.entries(record).filter(([k])=>['id','kind','merged_into'].includes(k)||q.authority.fields?.includes(k)));
 if(q.action==='identity.search')return finish(c,q,Object.values(records).filter(r=>!r.merged_into&&q.authority.resources.includes(r.id)&&Object.values(project(r)).some(v=>String(v).toLowerCase().includes(String(q.payload?.query??'').toLowerCase()))).map(project));
 let r=records[q.target];
 if(q.action==='identity.read'){requireValue(r,'IDENTITY_NOT_FOUND');return finish(c,q,project(r))}
 if(q.action==='identity.create'){requireValue(!r,'IDENTITY_EXISTS');ownKeys(q.payload,['kind','display_name','contact_identifiers']);requireValue(['Person','Organization'].includes(q.payload.kind),'IDENTITY_KIND');r=records[q.target]={id:q.target,aliases:[],external_refs:[],...q.payload};}
 else {requireValue(r&&!r.merged_into,'IDENTITY_NOT_ACTIVE');
 if(['identity.update','identity.correct'].includes(q.action)){ownKeys(q.payload,['display_name','contact_identifiers']);if(q.action==='identity.correct'){requireValue(q.authority.department==='Data'&&q.authority.relationship_conflicts_checked===true,'DATA_GOVERNANCE_REQUIRED');approval(q)}Object.assign(r,q.payload)}
 else if(q.action.startsWith('identity.alias.')){
  ownKeys(q.payload,['alias_subject_id','effective_from','effective_to']);
  requireValue(typeof q.payload.alias_subject_id==='string'&&q.payload.alias_subject_id!==r.id&&Number.isFinite(Date.parse(q.payload.effective_from)),'ALIAS_REQUIRED');
  const existing=r.aliases.find(a=>a.alias_subject_id===q.payload.alias_subject_id&&a.effective_from===q.payload.effective_from);
  if(q.action==='identity.alias.link'){
   requireValue(!q.payload.effective_to,'LINK_ACTIVE_ONLY');
   requireValue(!records[q.payload.alias_subject_id],'ACTIVE_OR_HISTORICAL_SUBJECT_REQUIRES_MERGE');
   requireValue(!Object.values(records).some(x=>x.aliases.some(a=>a.alias_subject_id===q.payload.alias_subject_id&&!a.effective_to)),'ALIAS_CONFLICT');
   requireValue(!existing,'ALIAS_HISTORY_IMMUTABLE');r.aliases.push({...q.payload,org_id:c.next.organization});
  }else {requireValue(existing&&!existing.effective_to&&Number.isFinite(Date.parse(q.payload.effective_to))&&Date.parse(q.payload.effective_to)>Date.parse(q.payload.effective_from),'ALIAS_END_REQUIRED');existing.effective_to=q.payload.effective_to}
 }
 else if(q.action.startsWith('identity.external-ref.')){
  ownKeys(q.payload,['namespace_id','object_type','external_id','lifecycle_scope']);
  requireValue(['namespace_id','object_type','external_id','lifecycle_scope'].every(k=>typeof q.payload[k]==='string'&&q.payload[k]),'EXTERNAL_REF_REQUIRED');
  const ref={org_id:c.next.organization,namespace_id:q.payload.namespace_id,object_type:q.payload.object_type,external_id:q.payload.external_id,lifecycle_scope:q.payload.lifecycle_scope};const key=digest(ref);
  if(q.action==='identity.external-ref.unlink')r.external_refs=r.external_refs.filter(x=>digest(x)!==key);
  else {requireValue(!Object.values(records).some(x=>x.id!==r.id&&!x.merged_into&&x.external_refs.some(v=>digest(v)===key)),'EXTERNAL_REF_CONFLICT');if(!r.external_refs.some(x=>digest(x)===key))r.external_refs.push(ref)}
 }
 else if(q.action==='identity.merge'){
  ownKeys(q.payload,['source_id','effective_from']);requireValue(q.authority.department==='Data'&&q.authority.relationship_conflicts_checked===true,'DATA_GOVERNANCE_REQUIRED');approval(q);
  const from=records[q.payload.source_id];requireValue(from&&from.id!==r.id&&!from.merged_into&&from.kind===r.kind&&q.authority.resources.includes(from.id)&&Number.isFinite(Date.parse(q.payload.effective_from)),'MERGE_SCOPE');requireValue(['aliases','external_refs'].every(k=>q.authority.fields?.includes(k)&&q.authority.source_fields?.includes(k)),'FIELD_SOURCE_AUTHORITY');
  r.aliases.push({org_id:c.next.organization,alias_subject_id:from.id,effective_from:q.payload.effective_from});
  r.external_refs=[...r.external_refs,...from.external_refs.filter(x=>!r.external_refs.some(y=>digest(x)===digest(y)))];from.merged_into=r.id;
 }
 }
 if(['identity.create','identity.update','identity.correct'].includes(q.action)){requireValue(Object.keys(q.payload).every(k=>q.authority.fields?.includes(k)&&q.authority.source_fields?.includes(k)),'FIELD_SOURCE_AUTHORITY')}
 return finish(c,q,project(r));
}
