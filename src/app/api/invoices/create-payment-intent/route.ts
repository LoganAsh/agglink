/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia' as any,
});

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { invoiceId } = await request.json();

    // Fetch invoice and verify contractor owns it
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('contractor_id', user.id)
      .single();

    if (error || !invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    if (invoice.status === 'paid') return NextResponse.json({ error: 'Already paid' }, { status: 400 });

    const amountOwed = Math.round((invoice.total_amount - invoice.amount_paid) * 100); // cents

    // If already has a payment intent, retrieve it; otherwise create a new one
    let paymentIntent;
    if (invoice.stripe_payment_intent_id) {
      paymentIntent = await stripe.paymentIntents.retrieve(invoice.stripe_payment_intent_id);
      if (paymentIntent.status === 'succeeded') {
        return NextResponse.json({ error: 'Payment already completed' }, { status: 400 });
      }
    } else {
      paymentIntent = await stripe.paymentIntents.create({
        amount: amountOwed,
        currency: 'usd',
        metadata: {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          contractor_id: user.id,
          supplier_id: invoice.supplier_id,
        },
      });

      await supabase.from('invoices').update({ stripe_payment_intent_id: paymentIntent.id }).eq('id', invoice.id);
    }

    return NextResponse.json({ clientSecret: paymentIntent.client_secret, amount: amountOwed });
  } catch (err: any) {
    console.error('Stripe error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
