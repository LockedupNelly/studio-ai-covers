import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { audio, mimeType } = await req.json()
    
    if (!audio) {
      throw new Error('No audio data provided')
    }

    console.log('Processing audio analysis request, mimeType:', mimeType)

    // Process audio in chunks
    const binaryAudio = processBase64Chunks(audio)
    console.log('Audio binary size:', binaryAudio.length)
    
    // Get file extension from mime type
    const extension = mimeType?.includes('mp3') ? 'mp3' : 
                     mimeType?.includes('wav') ? 'wav' : 
                     mimeType?.includes('m4a') ? 'm4a' :
                     mimeType?.includes('webm') ? 'webm' : 'mp3'

    // Use Lovable AI Gateway for analysis
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured')
    }

    // Since we can't transcribe directly, we'll analyze based on file metadata and generate suggestions
    // For a real implementation, you'd use a speech-to-text service first
    
    // Create a prompt for the AI to generate TWO DIFFERENT cover art concepts
    const analysisPrompt = `You are an AI assistant that helps generate album cover art descriptions. 
    
A user has uploaded an audio file (${extension} format, ${Math.round(binaryAudio.length / 1024)}KB).

Based on common music patterns and the file context, generate TWO COMPLETELY DIFFERENT creative album cover concepts that would work well for this type of audio content.

The two concepts should be artistically distinct - different visual themes, different moods, different artistic approaches. NOT just variations of the same idea.

Return a JSON object with the following structure:
{
  "suggestedPrompt": "A brief base description (30-50 words)",
  "detectedMood": "One of: Aggressive, Dark, Mysterious, Raw, Euphoric, Uplifting, Playful, Vibrant, Romantic, Sensual, Chill, Intimate, Melancholic, Ethereal, Nostalgic, Dreamy, Warm, Peaceful, Grand, Dramatic",
  "suggestedGenre": "One of: Hip-Hop / Rap, Pop, EDM, R&B, Rock, Alternative, Indie, Metal, Country, Jazz, Classical",
  "suggestedStyle": "A visual style",
  "confidence": 80,
  "conceptA": {
    "prompt": "First detailed album cover concept (60-100 words, vivid and artistic, completely unique direction)",
    "mood": "The mood for this concept",
    "style": "Visual style (e.g., Grunge Collage, Neon Glow, Vintage Film, Surreal, Oil Painting, etc.)"
  },
  "conceptB": {
    "prompt": "Second detailed album cover concept (60-100 words, COMPLETELY DIFFERENT artistic direction from conceptA)",
    "mood": "The mood for this concept (can be different from conceptA)",
    "style": "Visual style (DIFFERENT from conceptA)"
  }
}

IMPORTANT: conceptA and conceptB MUST be distinctly different artistic visions. For example:
- If conceptA is dark and moody, conceptB could be bright and colorful
- If conceptA is abstract, conceptB could be realistic
- If conceptA features nature, conceptB could be urban/futuristic

Generate creative and varied suggestions. Be artistic and imaginative.`

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: analysisPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('AI API error:', errorText)
      throw new Error(`AI analysis failed: ${response.status}`)
    }

    const aiResult = await response.json()
    console.log('AI response received')
    
    const content = aiResult.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('No content in AI response')
    }

    const analysis = JSON.parse(content)
    console.log('Analysis result:', analysis)

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in analyze-audio:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
