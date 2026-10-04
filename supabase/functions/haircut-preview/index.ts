import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import { fal } from "npm:@fal-ai/client"

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  try {
    const { video_url, storage_path, haircut_id, prompt } = await req.json()

    if (!video_url || !haircut_id || !prompt) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    const FAL_KEY            = Deno.env.get('FAL_KEY')!
    const SUPABASE_URL       = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SVC_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    fal.config({ credentials: FAL_KEY })

    const supabase = createClient(SUPABASE_URL, SUPABASE_SVC_KEY)

    // Call fal.ai — decart/lucy-edit/fast
    const result = await fal.subscribe('decart/lucy-edit/fast', {
      input: { video_url, prompt },
    })

    const resultUrl: string | undefined = (result as any)?.data?.video?.url

    // Delete source video from storage immediately (privacy)
    if (storage_path) {
      await supabase.storage.from('customer-videos').remove([storage_path])
    }

    // Log this render
    await supabase.from('render_logs').insert({
      haircut_id,
      status: resultUrl ? 'success' : 'failed',
    })

    if (!resultUrl) throw new Error('fal.ai returned no video URL')

    return new Response(JSON.stringify({ url: resultUrl }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  } catch (err: any) {
    console.error('haircut-preview error:', err)
    return new Response(JSON.stringify({ error: err?.message ?? 'Unknown error' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }
})
