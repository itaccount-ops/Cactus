/**
 * Generate a secure API key for OpenClaw integration
 * Run: npx tsx openclaw/generate-api-key.ts
 */
import { randomBytes } from 'crypto';

const key = `mep_ai_${randomBytes(32).toString('hex')}`;

console.log('='.repeat(60));
console.log('🔑 MEP AI API Key Generated');
console.log('='.repeat(60));
console.log('');
console.log('Add this to your environment variables:');
console.log('');
console.log(`AI_API_KEY=${key}`);
console.log('');
console.log('For Vercel, run:');
console.log(`  vercel env add AI_API_KEY`);
console.log('  Then paste the key above.');
console.log('');
console.log('For local .env:');
console.log(`  echo AI_API_KEY=${key} >> .env.local`);
console.log('');
console.log('For OpenClaw config:');
console.log(`  Set MEP_API_KEY=${key}`);
console.log('='.repeat(60));
