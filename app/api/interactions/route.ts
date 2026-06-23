import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getInteractionPrompt } from '@/lib/prompts';
import { analyzeInteractions } from '@/lib/bedrock';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', code: '401' }, { status: 401 });
    }

    // Fetch active medications
    const { data: meds, error: dbError } = await supabase
      .from('medications')
      .select('drug_name, generic_name')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (dbError) throw dbError;

    if (!meds || meds.length < 2) {
      return NextResponse.json({ interaction_warnings: [] });
    }

    // Connect with Bedrock utility for interactions
    const prompt = getInteractionPrompt(meds);
    const aiResponseString = await analyzeInteractions(prompt);
    const aiPayload = JSON.parse(aiResponseString);

    return NextResponse.json({
      interaction_warnings: aiPayload.interaction_warnings || []
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error', code: '500' }, { status: 500 });
  }
}
