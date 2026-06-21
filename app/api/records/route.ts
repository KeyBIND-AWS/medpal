import { NextResponse } from 'next/server'
import { createClient } from '../../../utils/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse request body
    const body = await request.json()
    const { drug_name, dosage, frequency, purpose, timing, instructions } = body

    // 3. Server-side validation
    if (!drug_name || drug_name.trim() === '') {
      return NextResponse.json({ error: 'Drug name is required' }, { status: 400 })
    }
    if (!dosage || dosage.trim() === '') {
      return NextResponse.json({ error: 'Dosage is required' }, { status: 400 })
    }
    if (!frequency || frequency.trim() === '') {
      return NextResponse.json({ error: 'Frequency is required' }, { status: 400 })
    }

    // 4. Insert into database
    const { data, error } = await supabase
      .from('records')
      .insert({
        user_id: user.id,
        drug_name: drug_name.trim(),
        dosage: dosage.trim(),
        frequency: frequency.trim(),
        purpose: purpose ? purpose.trim() : null,
        timing: timing || [],
        instructions: instructions ? instructions.trim() : null
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase DB error:', error)
      throw error
    }

    return NextResponse.json({ success: true, record: data })
  } catch (error) {
    console.error('API Server Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
