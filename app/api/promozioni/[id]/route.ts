import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'


export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { error } = await supabase
    .from('promozioni')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ message: 'Promozione eliminata' })
}



export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // Recupera l'id della promozione dai parametri
  const { id } = await params;

  // Recupera la promozione dal database tramite id
  const { data, error } = await supabase
    .from('promozioni')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: "Promozione non trovata: " + error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}






export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // ...
  const body = await request.json()

  const { data, error } = await supabase
    .from('promozioni')
    .update({
      name: body.name,
      description: body.description,
      valid_until: body.valid_until,
    })
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}