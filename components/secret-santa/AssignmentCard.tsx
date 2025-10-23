'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AssignmentCard({ data }:{ data: { receiverName?: string; receiverEmail?: string; wishlist?: string | null } | null }) {
  if (!data) {
    return (
      <Card>
        <CardHeader><CardTitle>Il mio destinatario</CardTitle></CardHeader>
        <CardContent>Non ancora disponibile. Effettua l’estrazione o attendi che l’admin la completi.</CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader><CardTitle>Il mio destinatario</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div><span className="font-medium">Nome/Email:</span> {data.receiverName ?? data.receiverEmail}</div>
        <div><span className="font-medium">Wishlist:</span> {data.wishlist?.trim() ? data.wishlist : '—'}</div>
      </CardContent>
    </Card>
  );
}
