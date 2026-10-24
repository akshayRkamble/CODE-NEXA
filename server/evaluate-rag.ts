import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { retrieve } from './rag.js';
const {Pool}=pg;
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required.');
const pool=new Pool({connectionString:process.env.DATABASE_URL});
type Item={question:string;source:string};
try{const golden=JSON.parse(await readFile('data/knowledge/eval-set.json','utf8')) as Item[];let hits=0;for(const item of golden){const results=await retrieve(pool,item.question);const hit=results.slice(0,6).some(result=>result.source===item.source);if(hit)hits++;else console.log(`MISS ${item.source}: ${item.question}`)}const rate=hits/golden.length;console.log(`retrieval hit-rate@6: ${hits}/${golden.length} (${(rate*100).toFixed(1)}%)`);if(rate<0.8)process.exitCode=1}finally{await pool.end()}
