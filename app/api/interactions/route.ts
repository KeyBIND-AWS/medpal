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
    let { data: meds, error: dbError } = await supabase
      .from('medications')
      .select('drug_name, generic_name')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (dbError) throw dbError;

    if (!meds || meds.length < 2) {
      // Seed 2 mock medications for testing purposes so the user has medications on their profile
      const seedMeds = [
        {
          user_id: user.id,
          drug_name: 'Amoxicillin (Mock)',
          generic_name: 'Amoxicillin Trihydrate (Mock)',
          dosage: '500mg',
          frequency: '3x a day',
          purpose: 'Bacterial infection (Mock)',
          instructions: 'Take after meals, finish the course. (Mock)',
          is_active: true
        },
        {
          user_id: user.id,
          drug_name: 'Ibuprofen (Mock)',
          generic_name: 'Advil (Mock)',
          dosage: '200mg',
          frequency: 'Every 6 hours as needed',
          purpose: 'Pain relief (Mock)',
          instructions: 'Take with food or milk. (Mock)',
          is_active: true
        }
      ];

      const { error: seedError } = await supabase
        .from('medications')
        .insert(seedMeds);

      if (seedError) throw seedError;

      // Re-fetch medications
      const { data: refetchedMeds, error: refetchError } = await supabase
        .from('medications')
        .select('drug_name, generic_name')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (refetchError) throw refetchError;
      meds = refetchedMeds;
    }

    // Connect with Bedrock utility for interactions
    const prompt = getInteractionPrompt(meds);
    const aiResponseString = await analyzeInteractions(prompt);

    // Clean response of potential markdown block wrapping (e.g. ```json ... ```)
    let cleanedResponse = aiResponseString.trim();
    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    }

    const aiPayload = JSON.parse(cleanedResponse);
    const warnings = aiPayload.interaction_warnings || [];

    // Sort by severity: high (1) -> moderate (2) -> low (3) -> others/fallback (99)
    const severityOrder: Record<string, number> = {
      high: 1,
      moderate: 2,
      low: 3
    };

    warnings.sort((a: any, b: any) => {
      const aVal = severityOrder[a.severity?.toLowerCase()] || 99;
      const bVal = severityOrder[b.severity?.toLowerCase()] || 99;
      return aVal - bVal;
    });

    return NextResponse.json({
      interaction_warnings: warnings
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error', code: '500' }, { status: 500 });
  }
}
