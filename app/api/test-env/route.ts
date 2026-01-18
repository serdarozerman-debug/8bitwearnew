import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const replicateToken = process.env.REPLICATE_API_TOKEN
  const openaiKey = process.env.OPENAI_API_KEY
  
  return NextResponse.json({
    replicate_token_exists: !!replicateToken,
    replicate_token_prefix: replicateToken?.substring(0, 10) || 'NONE',
    replicate_token_length: replicateToken?.length || 0,
    openai_key_exists: !!openaiKey,
    all_env_keys: Object.keys(process.env).filter(k => 
      k.includes('REPLICATE') || k.includes('OPENAI')
    ),
  })
}
