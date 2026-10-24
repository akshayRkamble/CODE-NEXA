import type { Pool } from 'pg';
export type RetrievedChunk = { source:string; title:string; topic:string|null; chunk_text:string; distance:number };
function apiRoot(){const value=process.env.AI_BASE_URL||'https://api.openai.com/v1';return value.endsWith('/')?value.slice(0,-1):value}
export async function embed(text:string):Promise<number[]>{
 let response:Response;let payload:unknown;
 if(process.env.RAG_PROVIDER==='ollama'){
  response=await fetch(`${process.env.OLLAMA_URL||'http://localhost:11434'}/api/embed`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:process.env.EMBEDDING_MODEL||'nomic-embed-text',input:text})});payload=await response.json();
 }else{
  const key=process.env.AI_API_KEY;if(!key)throw new Error('Set AI_API_KEY and EMBEDDING_MODEL to enable the tutor.');
  response=await fetch(`${apiRoot()}/embeddings`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({model:process.env.EMBEDDING_MODEL||'text-embedding-3-small',input:text})});payload=await response.json();
 }
 if(!response.ok)throw new Error(`Embedding service returned HTTP ${response.status}.`);
 const data=payload as {data?:{embedding:number[]}[];embeddings?:number[][]};const vector=data.data?.[0]?.embedding||data.embeddings?.[0];
 if(!vector||vector.length>1536)throw new Error('Embedding dimensions must be 1536 or smaller.');
 // Zero padding preserves cosine similarity while allowing smaller local embedding models.
 return vector.length===1536?vector:[...vector,...Array<number>(1536-vector.length).fill(0)];
}
export async function retrieve(pool:Pool,query:string,topic?:string):Promise<RetrievedChunk[]>{const vector=await embed(query);const sql=`SELECT c.source,d.title,d.topic,c.chunk_text,(c.embedding <=> $1::vector)::float AS distance FROM knowledge_chunks c JOIN knowledge_documents d USING(source) WHERE ($2::text IS NULL OR d.topic=$2) ORDER BY c.embedding <=> $1::vector LIMIT 6`;const result=await pool.query<RetrievedChunk>(sql,[`[${vector.join(',')}]`,topic||null]);return result.rows}
export function redactSecrets(text:string){return text.replace(/(sk-[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9]{20,}|Bearer\s+[A-Za-z0-9._-]+)/g,'[REDACTED_SECRET]')}
