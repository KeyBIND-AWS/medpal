import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { chat } from '@/lib/bedrock';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', code: '401' }, { status: 401 });
    }

    const { data: messages, error: historyError } = await supabase
      .from('chat_messages')
      .select('id, role, content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (historyError) throw historyError;

    return NextResponse.json({ messages: messages || [] });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json(
      { error: errorMessage, code: '500' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', code: '401' }, { status: 401 });
    }

    const { message } = await req.json();
    if (!message) {
      return NextResponse.json({ error: 'Message content is required.', code: '400' }, { status: 400 });
    }

    const { data: activeMeds } = await supabase
      .from('medications')
      .select('drug_name, generic_name, dosage, frequency, purpose')
      .eq('user_id', user.id)
      .eq('is_active', true);

    const { error: userMsgError } = await supabase
      .from('chat_messages')
      .insert({ user_id: user.id, role: 'user', content: message });
    if (userMsgError) throw userMsgError;

    const { data: recentMessages } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    const history = (recentMessages || []).reverse().slice(0, -1);

    const { data: profile } = await supabase
      .from('users')
      .select('language_pref')
      .eq('id', user.id)
      .single();

    const language = profile?.language_pref || 'bisaya';

    const aiResponseText = await chat(
      message,
      history,
      activeMeds || [],
      language,
    );

    const { error: aiMsgError } = await supabase
      .from('chat_messages')
      .insert({ user_id: user.id, role: 'assistant', content: aiResponseText });
    if (aiMsgError) throw aiMsgError;

    return NextResponse.json({ response: aiResponseText });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json(
      { error: errorMessage, code: '500' },
      { status: 500 },
    );
  }
}
