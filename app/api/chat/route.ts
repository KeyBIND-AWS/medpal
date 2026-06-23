import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { analyzeImage } from '@/lib/bedrock'; // Fallback interface helper

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', code: '401' }, { status: 401 });
    }

    const { message } = await req.json();
    if (!message) {
      return NextResponse.json({ error: 'Message content is required.', code: '400' }, { status: 400 });
    }

    // 2. Fetch active medication history to use as AI clinical context
    const { data: activeMeds } = await supabase
      .from('medications')
      .select('drug_name, generic_name, dosage, frequency, purpose, instructions')
      .eq('user_id', user.id)
      .eq('is_active', true);

    // 3. Log user message to the database tracking history table
    const { error: userMsgError } = await supabase
      .from('chat_messages')
      .insert({
        user_id: user.id,
        role: 'user',
        content: message
      });
    if (userMsgError) throw userMsgError;

    // 4. Formatting clinical context block for David's prompt constraints
    const contextString = activeMeds && activeMeds.length > 0
      ? activeMeds.map(m => `- ${m.drug_name} (${m.generic_name || 'N/A'}): ${m.dosage}, ${m.frequency}. Gireseta para sa: ${m.purpose}`).join('\n')
      : 'No active medications on profile.';

    // Constructing system constraints (Enforcing explanation-only parameters, strictly blocking diagnostic guesses)
    const systemPrompt = `You are HatidDok AI, a helpful medical companion explaining clinical profiles in Bisaya. 
Current Patient Active Medications Context:\n${contextString}\n
CRITICAL SAFETY RULE: Only explain current items. Never diagnose conditions. Never change prescription instructions. Always mention to consult a professional pharmacist or doctor.`;

    // 5. In a production state, pass systemPrompt + message into David's Bedrock client handler.
    // For local validation passes, handle a structured, safe localized string fallback string response:
    const aiResponseText = "Salamat sa imong pangutana. Kabahin sa imong tambal, sunda kanunay ang giingon sa imong doktor o parmasyutiko aron luwas ang imong pag-inom.";

    // 6. Log the generated Assistant response row back to Postgres
    const { error: aiMsgError } = await supabase
      .from('chat_messages')
      .insert({
        user_id: user.id,
        role: 'assistant',
        content: aiResponseText
      });
    if (aiMsgError) throw aiMsgError;

    return NextResponse.json({ response: aiResponseText });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal Server Error', code: '500' }, 
      { status: 500 }
    );
  }
}
