import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { chunkText } from './chunker.js';
import { embed } from './rag.js';

const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const root = path.resolve('data/knowledge');
const provider = process.env.RAG_PROVIDER || 'openai';
const embeddingModel = process.env.EMBEDDING_MODEL
  || (provider === 'google'
    ? 'gemini-embedding-001'
    : provider === 'ollama'
      ? 'nomic-embed-text'
      : 'text-embedding-3-small');
const embeddingConfig = `${provider}:${embeddingModel}`;
const client = await pool.connect();

try {
  for (const file of await readdir(root)) {
    if (!file.endsWith('.md')) continue;

    const source = file.replace(/\.md$/, '');
    const content = await readFile(path.join(root, file), 'utf8');
    const hash = createHash('sha256')
      .update(content)
      .update('\0')
      .update(embeddingConfig)
      .digest('hex');
    const title = content.split('\n').find(line => line.startsWith('# '))?.slice(2) || source;
    const topic = source.split('-').map(part => part[0]?.toUpperCase() + part.slice(1)).join(' ');
    const prior = await client.query('SELECT content_hash FROM knowledge_documents WHERE source=$1', [source]);

    if (prior.rows[0]?.content_hash === hash) {
      console.log(`skip ${file}: unchanged`);
      continue;
    }

    await client.query('BEGIN');
    try {
      await client.query(
        'INSERT INTO knowledge_documents(source,title,topic,language,content_hash) VALUES($1,$2,$3,$4,$5) ON CONFLICT(source) DO UPDATE SET title=EXCLUDED.title,topic=EXCLUDED.topic,content_hash=EXCLUDED.content_hash,updated_at=now()',
        [source, title, topic, null, hash]
      );
      await client.query('DELETE FROM knowledge_chunks WHERE source=$1', [source]);

      for (const [index, chunk] of chunkText(content).entries()) {
        const vector = await embed(chunk);
        await client.query(
          'INSERT INTO knowledge_chunks(source,chunk_index,chunk_text,embedding) VALUES($1,$2,$3,$4::vector)',
          [source, index, chunk, `[${vector.join(',')}]`]
        );
      }

      await client.query('COMMIT');
      console.log(`ingested ${file}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
} finally {
  client.release();
  await pool.end();
}
