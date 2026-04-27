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

    const { invoiceId, paymentIntentId } = await request.json();

    // Verify the payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    const amount = paymentIntent.amount / 100;

    // Insert payment record
    await supabase.from('invoice_payments').insert({
      invoice_id: invoiceId,
      amount,
      payment_method: 'stripe',
      stripe_payment_id: paymentIntentId,
      reference_number: paymentIntent.id,
    });

    // Update invoice as paid
    const { data: invoice } = await supabase
      .from('invoices')
      .select('total_amount, amount_paid')
      .eq('id', invoiceId)
      .single();
    const newAmountPaid = (invoice?.amount_paid || 0) + amount;
    const isFullyPaid = newAmountPaid >= (invoice?.total_amount || 0);

    await supabase.from('invoices').update({
      amount_paid: newAmountPaid,
      status: isFullyPaid ? 'paid' : 'sent',
      paid_date: isFullyPaid ? new Date().toISOString().split('T')[0] : null,
    }).eq('id', invoiceId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
