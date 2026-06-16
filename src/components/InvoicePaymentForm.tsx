/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Skeleton } from '@/components/Skeleton';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function PaymentForm({ invoiceId, amount, onSuccess, onCancel }: { invoiceId: string; amount: number; onSuccess: () => void; onCancel: () => void; }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setIsProcessing(true);
    setError(null);

    const { error: submitError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (submitError) {
      setError(submitError.message || 'Payment failed');
      setIsProcessing(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      // Confirm with backend
      await fetch('/api/invoices/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId, paymentIntentId: paymentIntent.id }),
      });
      onSuccess();
    }
    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex space-x-3 pt-2">
        <button type="button" onClick={onCancel} disabled={isProcessing}
          className="flex-1 py-2 rounded-lg text-sm font-semibold border border-zinc-200 text-zinc-700 hover:bg-zinc-100 transition-all disabled:opacity-40">
          Cancel
        </button>
        <button type="submit" disabled={!stripe || isProcessing}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white py-2 rounded-lg text-sm font-semibold transition-all">
          {isProcessing ? 'Processing...' : `Pay $${(amount / 100).toFixed(2)}`}
        </button>
      </div>
    </form>
  );
}

export default function InvoicePaymentForm({ invoiceId, onClose, onSuccess }: { invoiceId: string; onClose: () => void; onSuccess: () => void; }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/invoices/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else { setClientSecret(data.clientSecret); setAmount(data.amount); }
      })
      .catch(err => setError(err.message || 'Failed to load payment form'));
  }, [invoiceId]);

  if (error) return <div className="text-red-700 text-sm py-3">{error}</div>;
  if (!clientSecret) {
    return (
      <div className="space-y-3 py-2" aria-label="Loading payment form">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-10 w-1/2" />
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'flat' } }}>
      <PaymentForm invoiceId={invoiceId} amount={amount} onSuccess={onSuccess} onCancel={onClose} />
    </Elements>
  );
}
