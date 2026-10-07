import {createHash} from 'node:crypto';
export function fail(message){throw new Error(message)}
export function requireValue(value,message){if(!value)fail(message)}
export const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function begin(state, request, actions, writes){
 requireValue(state.organization&&request.organization===state.organization,'ORGANIZATION_SCOPE');
 const auth=request.authority;
 requireValue(auth?.authenticated===true&&auth.organization===state.organization&&auth.actor&&auth.policy_revision&&auth.current===true&&!auth.revoked&&!auth.hold,'AUTHORITY_REQUIRED');
 requireValue(actions.includes(request.action)&&auth.actions?.includes(request.action),'ACTION_DENIED');
 requireValue(Array.isArray(auth.resources)&&auth.resources.includes(request.target),'RESOURCE_SCOPE');
 const read=!writes.includes(request.action);
 if(read)return {next:structuredClone(state),read};
 requireValue(request.operation_id&&request.evidence?.source&&request.evidence?.reference&&request.evidence?.recorded_at,'PROVENANCE_REQUIRED');
 const fingerprint=digest({action:request.action,target:request.target,payload:request.payload,evidence:request.evidence});
 const prior=state.operations?.[request.operation_id];
 if(prior){requireValue(prior.fingerprint===fingerprint,'OPERATION_CONFLICT');return {next:structuredClone(state),replay:structuredClone(prior.result)}}
 requireValue(request.expected_revision===state.revision,'REVISION_CONFLICT');
 return {next:structuredClone(state),read,fingerprint};
}
export function finish(context,request,result){
 if(context.read)return {state:context.next,result};
 context.next.revision++;
 context.next.operations??={};context.next.operations[request.operation_id]={fingerprint:context.fingerprint,result:structuredClone(result)};
 context.next.history??=[];context.next.history.push({action:request.action,target:request.target,operation_id:request.operation_id,evidence:structuredClone(request.evidence),revision:context.next.revision});
 return {state:context.next,result};
}
export function approval(request){const a=request.authority;requireValue(a.approval?.approved===true&&a.approval.principal&&a.approval.principal!==a.actor&&a.approval.payload_digest===digest(request.payload)&&a.approval.policy_revision===a.policy_revision&&a.approval.action===request.action&&a.approval.target===request.target&&a.approval.organization===request.organization&&a.approval.current===true&&!a.approval.revoked,'EXACT_OWNER_APPROVAL_REQUIRED')}
export function ownKeys(value,allowed){requireValue(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>allowed.includes(k)),'UNOWNED_FIELDS')}
